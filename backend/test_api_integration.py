"""
Pruebas de integración de la API FastAPI (AcadeQR) sin requerir XAMPP MySQL activo.
Valida: /api/health, /api/auth/login, /api/auth/me, RBAC, /api/sesiones,
/api/qr/rotate, /api/qr/generate (Pillow PNG), y /api/asistencias/scan (geocerca).
"""

import datetime
from unittest.mock import patch
from fastapi.testclient import TestClient

import app as backend_app


class FakeCursor:
    def __init__(self, state):
        self.state = state
        self._one = None
        self._all = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, query, params=None):
        q = " ".join(query.split()).lower()
        params = params or ()

        if q.startswith("select count(*) as c from "):
            tbl = q.split("from ")[1].strip().strip("`")
            self._one = {"c": len(self.state.get(tbl, []))}
        elif "from usuarios where email = %s" in q:
            email = params[0]
            self._one = next((u for u in self.state["usuarios"] if u["email"] == email), None)
        elif "from usuarios where id = %s" in q:
            uid = params[0]
            self._one = next((u for u in self.state["usuarios"] if u["id"] == uid), None)
        elif "from usuarios where 1=1" in q:
            self._all = list(self.state["usuarios"])
        elif q.startswith("insert into sesiones"):
            sid, inst_id, coh, nom, dep, sede, aula, fec, hi, hf, geo, gra = params
            self.state["sesiones"].append(
                {
                    "id": sid,
                    "instructor_id": inst_id,
                    "instructor_nombre": "Admin AcadeQR",
                    "codigo_cohorte": coh,
                    "nombre": nom,
                    "departamento": dep,
                    "sede": sede,
                    "aula": aula,
                    "fecha": fec,
                    "hora_inicio": hi,
                    "hora_fin": hf,
                    "activa": 1,
                    "geocerca_metros": geo,
                    "gracia_minutos": gra,
                    "creado_en": datetime.datetime.now().isoformat(),
                }
            )
        elif "from sesiones s left join usuarios u" in q and "where s.id = %s" in q:
            sid = params[0]
            self._one = next((s for s in self.state["sesiones"] if s["id"] == sid), None)
        elif "from sesiones s left join usuarios u" in q:
            self._all = list(self.state["sesiones"])
        elif "from sesiones where id = %s" in q:
            sid = params[0]
            self._one = next((s for s in self.state["sesiones"] if s["id"] == sid), None)
        elif q.startswith("update codigos_qr set revocado = 1"):
            sid = params[0]
            for qr in self.state["codigos_qr"]:
                if qr["sesion_id"] == sid:
                    qr["revocado"] = 1
        elif q.startswith("insert into codigos_qr"):
            qid, sid, token, exp = params
            self.state["codigos_qr"].append(
                {
                    "id": qid,
                    "sesion_id": sid,
                    "token": token,
                    "expira_en": exp,
                    "revocado": 0,
                    "creado_en": datetime.datetime.now(),
                }
            )
        elif "from codigos_qr where sesion_id = %s and token = %s" in q:
            sid, tok = params
            self._one = next(
                (qr for qr in self.state["codigos_qr"] if qr["sesion_id"] == sid and qr["token"] == tok),
                None,
            )
        elif "from codigos_qr where sesion_id = %s and revocado = 0" in q:
            sid = params[0]
            now = datetime.datetime.now()
            matches = [
                qr
                for qr in self.state["codigos_qr"]
                if qr["sesion_id"] == sid and qr["revocado"] == 0 and qr["expira_en"] > now
            ]
            self._one = matches[-1] if matches else None
        elif q.startswith("insert into asistencias"):
            aid, sid, apr, est, dist, sig, nota, fecha_reg = params
            self.state["asistencias"].append(
                {
                    "id": aid,
                    "sesion_id": sid,
                    "aprendiz_id": apr,
                    "estado": est,
                    "metodo": "Dynamic QR",
                    "distancia_metros": dist,
                    "firma_token": sig,
                    "nota": nota,
                    "registrado_en": f"{fecha_reg}T08:05:00",
                }
            )
        elif "from asistencias a left join usuarios u" in q:
            sid = params[0]
            self._all = [a for a in self.state["asistencias"] if a["sesion_id"] == sid]

    def fetchone(self):
        return self._one

    def fetchall(self):
        return self._all


class FakeConn:
    def __init__(self, state):
        self.state = state

    def cursor(self):
        return FakeCursor(self.state)

    def close(self):
        pass


def run_integration_suite():
    admin_hash = backend_app.hash_password("Admin123!")
    state = {
        "usuarios": [
            {
                "id": "usr-admin",
                "nombre": "Admin AcadeQR",
                "documento": "CC 1000000001",
                "email": "admin@acadeqr.edu.co",
                "password_hash": admin_hash,
                "rol": "ADMIN",
                "programa": "Dirección Académica",
                "sede": "Sede Central",
                "activo": 1,
            },
            {
                "id": "lrn-01",
                "nombre": "Estefanía Olaya",
                "documento": "CC 1025889102",
                "email": "estefania@soy.sena.edu.co",
                "password_hash": admin_hash,
                "rol": "APRENDIZ",
                "programa": "ADSO",
                "sede": "Sede Central",
                "activo": 1,
            },
        ],
        "sesiones": [
            {
                "id": "ses-2841",
                "instructor_id": "usr-admin",
                "instructor_nombre": "Admin AcadeQR",
                "codigo_cohorte": "COH-2841",
                "nombre": "Mecatrónica Industrial",
                "departamento": "Automatización",
                "sede": "Sede Norte",
                "aula": "Taller B-204",
                "fecha": datetime.date.today().isoformat(),
                "hora_inicio": "08:00:00",
                "hora_fin": "12:00:00",
                "activa": 1,
                "geocerca_metros": 50,
                "gracia_minutos": 15,
                "creado_en": datetime.datetime.now().isoformat(),
            }
        ],
        "codigos_qr": [],
        "asistencias": [],
    }

    with patch.object(backend_app, "get_db_connection", side_effect=lambda: FakeConn(state)):
        client = TestClient(backend_app.app)

        # 1. Health
        r = client.get("/api/health")
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "online"

        # 2. Protected route without token must fail 401
        r = client.get("/api/sesiones")
        assert r.status_code == 401

        # 3. Login + /api/auth/me
        r = client.post("/api/auth/login", json={"email": "admin@acadeqr.edu.co", "password": "Admin123!"})
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        r = client.get("/api/auth/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["usuario"]["rol"] == "ADMIN"

        # 4. Create session + rotate QR + active QR + PNG generation
        r = client.post(
            "/api/sesiones",
            headers=headers,
            json={
                "codigo_cohorte": "COH-5120",
                "nombre": "Control PLC",
                "departamento": "Automatización",
                "sede": "Sede Norte",
                "aula": "Lab E-104",
                "hora_inicio": "14:00:00",
                "hora_fin": "18:00:00",
                "geocerca_metros": 50,
                "gracia_minutos": 15,
            },
        )
        assert r.status_code == 201, r.text
        ses_id = r.json()["sesion_id"]

        r = client.post("/api/qr/rotate", headers=headers, json={"sesion_id": ses_id, "segundos_validez": 45})
        assert r.status_code == 200, r.text
        qr_token = r.json()["token"]

        r = client.get(f"/api/qr/active/{ses_id}")
        assert r.status_code == 200
        assert r.json()["qr"]["token"] == qr_token

        r = client.post("/api/qr/generate", json={"data": qr_token, "size": 300})
        assert r.status_code == 200
        assert r.json()["mime"] == "image/png"

        # 5. Geofence rejection & valid scan
        r_out = client.post(
            "/api/asistencias/scan",
            headers=headers,
            json={"sesion_id": ses_id, "token_qr": qr_token, "distancia_metros": 120, "aprendiz_id": "lrn-01"},
        )
        assert r_out.status_code == 403, r_out.text

        r_ok = client.post(
            "/api/asistencias/scan",
            headers=headers,
            json={"sesion_id": ses_id, "token_qr": qr_token, "distancia_metros": 12, "aprendiz_id": "lrn-01"},
        )
        assert r_ok.status_code == 201, r_ok.text

    print("BACKEND INTEGRATION SUITE PASSED (5/5 groups OK)")


if __name__ == "__main__":
    run_integration_suite()
