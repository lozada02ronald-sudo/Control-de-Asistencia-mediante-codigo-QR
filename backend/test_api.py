"""
Script de Pruebas Automatizadas para la API REST Python (AcadeQR)
Verifica endpoints, autenticación JWT, operaciones CRUD y conexión con XAMPP MySQL.
"""

import sys
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("EJECUTANDO BATERÍA DE PRUEBAS AUTOMATIZADAS DE LA API REST")
    print("=" * 60)

    # 1. Test Health
    print("[1] Probando GET /api/health...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Error en health: {res.text}"
    health_data = res.json()
    print(f"    Status: {health_data['status']}")
    print(f"    DB Status: {health_data['database']['status']}")
    print(f"    Tablas y conteos: {health_data['database']['tables']}")
    assert health_data["database"]["status"] == "conectado_mysql_xampp", "MySQL no está conectado correctamente"

    # 2. Test Login Admin
    print("\n[2] Probando POST /api/auth/login (Admin)...")
    login_payload = {
        "email": "admin@acadeqr.edu.co",
        "password": "Admin123!"
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Error en login: {res.text}"
    login_data = res.json()
    token = login_data["access_token"]
    print(f"    Token JWT generado: {token[:25]}... (Longitud: {len(token)})")
    print(f"    Usuario: {login_data['usuario']['nombre']} (Rol: {login_data['usuario']['rol']})")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Test Auth Me
    print("\n[3] Probando GET /api/auth/me...")
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200, f"Error en auth/me: {res.text}"
    me_data = res.json()
    print(f"    Identidad validada: {me_data['usuario']['email']} ({me_data['usuario']['rol']})")

    # 4. Test CRUD Usuarios
    print("\n[4] Probando GET /api/usuarios (CRUD Read)...")
    res = client.get("/api/usuarios", headers=headers)
    assert res.status_code == 200, f"Error al listar usuarios: {res.text}"
    users_data = res.json()
    print(f"    Total usuarios en base de datos: {users_data['total']}")

    # 5. Test CRUD Sesiones
    print("\n[5] Probando GET /api/sesiones (CRUD Read)...")
    res = client.get("/api/sesiones", headers=headers)
    assert res.status_code == 200, f"Error al listar sesiones: {res.text}"
    sessions_data = res.json()
    print(f"    Total sesiones en base de datos: {sessions_data['total']}")
    session_id = sessions_data["sesiones"][0]["id"]
    print(f"    Sesión de prueba seleccionada: {session_id}")

    # 6. Test QR Rotate
    print(f"\n[6] Probando POST /api/qr/rotate para sesión {session_id}...")
    res = client.post("/api/qr/rotate", json={"sesion_id": session_id, "segundos_validez": 45}, headers=headers)
    assert res.status_code == 200, f"Error al rotar QR: {res.text}"
    rotate_data = res.json()
    new_token = rotate_data["token"]
    print(f"    Nuevo token rotado: {new_token}")

    # 7. Test QR Active
    print(f"\n[7] Probando GET /api/qr/active/{session_id}...")
    res = client.get(f"/api/qr/active/{session_id}")
    assert res.status_code == 200, f"Error al consultar QR activo: {res.text}"
    active_data = res.json()
    print(f"    Token activo confirmado: {active_data['qr']['token']}")

    # 8. Test QR Generate Image (Pillow)
    print("\n[8] Probando POST /api/qr/generate (Generación de imagen PNG con Pillow)...")
    gen_payload = {
        "data": new_token,
        "fg_color": "#006948",
        "bg_color": "#ffffff",
        "size": 360,
        "badge_text": "ACADEQR"
    }
    res = client.post("/api/qr/generate", json=gen_payload)
    assert res.status_code == 200, f"Error al generar imagen QR: {res.text}"
    qr_img = res.json()
    print(f"    MIME: {qr_img['mime']}")
    print(f"    Base64 (primeros 50 caracteres): {qr_img['base64'][:50]}...")

    # 9. Test Asistencia Scan (Validación en tiempo real)
    print("\n[9] Probando POST /api/asistencias/scan (Validación de Asistencia con Geocerca)...")
    scan_payload = {
        "sesion_id": session_id,
        "token_qr": new_token,
        "distancia_metros": 14,
        "aprendiz_id": "lrn-01"
    }
    res = client.post("/api/asistencias/scan", json=scan_payload, headers=headers)
    assert res.status_code == 201, f"Error en escaneo: {res.text}"
    scan_res = res.json()
    print(f"    Resultado: {scan_res['mensaje']}")
    print(f"    Firma generada: {scan_res['firma_token']}")

    # 10. Test Asistencias Resumen Métricas
    print(f"\n[10] Probando GET /api/asistencias/resumen/{session_id}...")
    res = client.get(f"/api/asistencias/resumen/{session_id}", headers=headers)
    assert res.status_code == 200, f"Error al obtener métricas: {res.text}"
    summary_data = res.json()
    print(f"    Métricas consolidadas:")
    for k, v in summary_data["metricas"].items():
        print(f"      - {k}: {v}")

    print("\n" + "=" * 60)
    print("TODAS LAS PRUEBAS (10/10) PASARON EXITOSAMENTE [OK]")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
