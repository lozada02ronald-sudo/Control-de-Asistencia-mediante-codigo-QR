"""
AcadeQR — API REST Completa en Python (FastAPI + MySQL XAMPP)
Control de Asistencia mediante Código QR Dinámico

Incluye:
- Base de datos MySQL (acadeqr_db en XAMPP)
- Autenticación JWT y Hashing seguro con Bcrypt
- Autorización basada en roles (RBAC: ADMIN, INSTRUCTOR, APRENDIZ)
- Operaciones CRUD completas para Usuarios, Sesiones y Asistencias
- Motor de generación y rotación de Códigos QR con Pillow
- Documentación OpenAPI / Swagger automática e interactiva
"""

import base64
import datetime
import io
import os
import uuid
from typing import Any, Dict, List, Literal, Optional

import bcrypt
import jwt
import pymysql
import pymysql.cursors
import qrcode
from fastapi import Depends, FastAPI, HTTPException, Query, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, EmailStr, Field

# ==========================================================
# Configuración y Variables de Entorno
# ==========================================================
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "acadeqr_db")

JWT_SECRET = os.getenv("JWT_SECRET", "acadeqr-secreto-jwt-super-seguro-2026-sena-xyz-32chars")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

# ==========================================================
# Inicialización de la Aplicación FastAPI con Swagger
# ==========================================================
app = FastAPI(
    title="AcadeQR — API REST Institucional",
    description="""
API RESTful profesional para el control y verificación de asistencia académica mediante códigos QR dinámicos rotativos.

### Funcionalidades Principales:
* **Autenticación & Autorización:** JWT Tokens con control de acceso basado en roles (`ADMIN`, `INSTRUCTOR`, `APRENDIZ`).
* **CRUD de Usuarios:** Gestión completa de directivos, instructores y aprendices.
* **CRUD de Sesiones:** Creación, monitoreo en vivo, reglas de geocerca y margen de gracia.
* **Motor QR Dinámico:** Rotación de tokens temporales de sesión e imágenes QR personalizadas con Pillow.
* **Registro y Validación de Asistencia:** Verificación en tiempo real de token, proximidad geográfica y cálculo automático de puntualidad o tardanza.
    """,
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Autenticación", "description": "Endpoints de registro, inicio de sesión y perfil de usuario."},
        {"name": "Usuarios", "description": "CRUD y gestión de aprendices, instructores y administradores."},
        {"name": "Sesiones de Clase", "description": "CRUD de sesiones académicas, parámetros de geocerca y estado en vivo."},
        {"name": "Códigos QR Dinámicos", "description": "Generación visual y rotación de tokens temporales para proyector y escáner."},
        {"name": "Asistencias", "description": "Validación de escaneo, listados, modificaciones manuales y reportes métricos."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# ==========================================================
# Manejo de Conexión a MySQL
# ==========================================================
def get_db_connection():
    try:
        return pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
            charset="utf8mb4",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo conectar a la base de datos MySQL en XAMPP ({DB_HOST}:{DB_PORT}): {str(exc)}",
        )


# ==========================================================
# Utilidades de Seguridad (Bcrypt & JWT)
# ==========================================================
def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere token de autenticación Bearer en el encabezado Authorization.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="El token ha expirado.")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token no válido o corrupto.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, nombre, email, rol, programa, sede, activo FROM usuarios WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user or not user["activo"]:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo o no encontrado.")
            return user
    finally:
        conn.close()


def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["rol"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


# ==========================================================
# Esquemas Pydantic para Validación y Documentación
# ==========================================================
class UserRegisterRequest(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=120, example="Estefanía Olaya")
    documento: Optional[str] = Field(None, example="CC 1.025.889.102")
    email: EmailStr = Field(..., example="estefania.olaya@soy.sena.edu.co")
    password: str = Field(..., min_length=6, example="ClaveSegura123")
    rol: Literal["ADMIN", "INSTRUCTOR", "APRENDIZ"] = Field(default="APRENDIZ")
    programa: Optional[str] = Field(None, example="Tecnología en Desarrollo de Software")
    sede: Optional[str] = Field(None, example="Sede Central")


class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., example="admin@acadeqr.edu.co")
    password: str = Field(..., example="Admin123!")


class UserUpdateRequest(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=120)
    documento: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    rol: Optional[Literal["ADMIN", "INSTRUCTOR", "APRENDIZ"]] = None
    programa: Optional[str] = None
    sede: Optional[str] = None
    activo: Optional[bool] = None


class SessionCreateRequest(BaseModel):
    instructor_id: Optional[str] = Field(None, description="ID del instructor. Si se omite, se usa el instructor autenticado.")
    codigo_cohorte: str = Field(..., example="COH-2841", max_length=40)
    nombre: str = Field(..., example="Mecatrónica Industrial y Control PLC", max_length=180)
    departamento: Optional[str] = Field("Automatización", max_length=160)
    sede: str = Field("Sede Técnica Norte", max_length=120)
    aula: str = Field("Taller B-204", max_length=80)
    fecha: Optional[str] = Field(None, example="2026-11-24", description="Formato YYYY-MM-DD. Por defecto hoy.")
    hora_inicio: str = Field("08:00:00", example="08:00:00")
    hora_fin: str = Field("12:00:00", example="12:00:00")
    geocerca_metros: int = Field(50, ge=10, le=500, description="Radio máximo permitido de geolocalización en metros.")
    gracia_minutos: int = Field(15, ge=0, le=60, description="Minutos de gracia antes de marcar tardanza.")


class SessionUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    aula: Optional[str] = None
    activa: Optional[bool] = None
    geocerca_metros: Optional[int] = Field(None, ge=10, le=500)
    gracia_minutos: Optional[int] = Field(None, ge=0, le=60)


class QrRotateRequest(BaseModel):
    sesion_id: str = Field(..., example="ses-2841")
    segundos_validez: int = Field(default=30, ge=10, le=300)


class QrGenerateRequest(BaseModel):
    data: str = Field(..., example="ACADEQR:COH-2841:TK-882194:SEC-104")
    fg_color: str = Field("#006948", example="#006948")
    bg_color: str = Field("#ffffff", example="#ffffff")
    size: int = Field(420, ge=180, le=1024)
    badge_text: Optional[str] = Field("ACADEQR", max_length=12)


class AttendanceScanRequest(BaseModel):
    sesion_id: str = Field(..., example="ses-2841")
    token_qr: str = Field(..., example="ACADEQR:COH-2841:TK-882194:SEC-104")
    distancia_metros: int = Field(..., ge=0, example=15, description="Distancia GPS calculada entre el aprendiz y el aula.")
    aprendiz_id: Optional[str] = Field(None, description="ID del aprendiz. Si se omite, se toma del token de usuario autenticado.")


class AttendanceUpdateRequest(BaseModel):
    estado: Literal["PRESENTE", "TARDANZA", "AUSENTE", "EXCUSA"]
    nota: Optional[str] = Field(None, max_length=255)


# ==========================================================
# 1. Endpoints de Diagnóstico y Salud
# ==========================================================
@app.get("/api/health", tags=["Autenticación"], summary="Verificar estado del API y MySQL")
def health_check():
    """Devuelve el estado operativo del motor Python y la conexión activa a MySQL en XAMPP."""
    db_status = "desconectado"
    table_counts = {}
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            for tbl in ["usuarios", "sesiones", "codigos_qr", "asistencias"]:
                cur.execute(f"SELECT COUNT(*) as c FROM `{tbl}`")
                table_counts[tbl] = cur.fetchone()["c"]
        conn.close()
        db_status = "conectado_mysql_xampp"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "online",
        "engine": "Python 3 + FastAPI + PyMySQL + Bcrypt + JWT",
        "database": {
            "driver": "MySQL 8 / MariaDB (XAMPP)",
            "host": f"{DB_HOST}:{DB_PORT}",
            "name": DB_NAME,
            "status": db_status,
            "tables": table_counts,
        },
        "docs_url": "/docs",
    }


# ==========================================================
# 2. Endpoints de Autenticación (Auth & JWT)
# ==========================================================
@app.post("/api/auth/register", tags=["Autenticación"], status_code=status.HTTP_201_CREATED, summary="Registrar nuevo usuario")
def register_user(req: UserRegisterRequest):
    """Crea una nueva cuenta de usuario en MySQL con contraseña encriptada usando Bcrypt."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM usuarios WHERE email = %s", (req.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya se encuentra registrado.")

            user_id = f"usr-{uuid.uuid4().hex[:8]}"
            pwd_hash = hash_password(req.password)

            cursor.execute(
                """
                INSERT INTO usuarios (id, nombre, documento, email, password_hash, rol, programa, sede, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1)
                """,
                (user_id, req.nombre, req.documento, req.email, pwd_hash, req.rol, req.programa, req.sede),
            )

        token = create_access_token({"sub": user_id, "email": req.email, "rol": req.rol})
        return {
            "mensaje": "Usuario registrado exitosamente.",
            "access_token": token,
            "token_type": "bearer",
            "usuario": {
                "id": user_id,
                "nombre": req.nombre,
                "email": req.email,
                "rol": req.rol,
                "programa": req.programa,
                "sede": req.sede,
            },
        }
    finally:
        conn.close()


@app.post("/api/auth/login", tags=["Autenticación"], summary="Iniciar sesión y obtener JWT")
def login_user(req: UserLoginRequest):
    """Verifica las credenciales en MySQL y retorna un token JWT Bearer válido por 24 horas."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, nombre, email, password_hash, rol, programa, sede, activo 
                FROM usuarios WHERE email = %s
                """,
                (req.email,),
            )
            user = cursor.fetchone()

            if not user or not verify_password(req.password, user["password_hash"]):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas (correo o contraseña).")

            if not user["activo"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario se encuentra inactivo.")

            token = create_access_token({"sub": user["id"], "email": user["email"], "rol": user["rol"]})

            return {
                "access_token": token,
                "token_type": "bearer",
                "usuario": {
                    "id": user["id"],
                    "nombre": user["nombre"],
                    "email": user["email"],
                    "rol": user["rol"],
                    "programa": user["programa"],
                    "sede": user["sede"],
                },
            }
    finally:
        conn.close()


@app.get("/api/auth/me", tags=["Autenticación"], summary="Obtener perfil del usuario autenticado")
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Retorna los datos del usuario logueado extrayendo su identidad del Bearer Token."""
    return {"usuario": current_user}


# ==========================================================
# 3. Operaciones CRUD: Usuarios
# ==========================================================
@app.get("/api/usuarios", tags=["Usuarios"], summary="Listar usuarios (con filtros)")
def list_users(
    rol: Optional[str] = Query(None, description="Filtrar por ADMIN, INSTRUCTOR o APRENDIZ"),
    q: Optional[str] = Query(None, description="Búsqueda por nombre, documento o email"),
    current_user: dict = Depends(require_roles(["ADMIN", "INSTRUCTOR"])),
):
    """Permite listar los usuarios registrados. Protegido: Requiere rol ADMIN o INSTRUCTOR."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = "SELECT id, nombre, documento, email, rol, programa, sede, avatar_color, activo, creado_en FROM usuarios WHERE 1=1"
            params = []
            if rol:
                query += " AND rol = %s"
                params.append(rol.upper())
            if q:
                query += " AND (nombre LIKE %s OR documento LIKE %s OR email LIKE %s)"
                term = f"%{q}%"
                params.extend([term, term, term])

            query += " ORDER BY creado_en DESC"
            cursor.execute(query, tuple(params))
            usuarios = cursor.fetchall()
            return {"total": len(usuarios), "usuarios": usuarios}
    finally:
        conn.close()


@app.get("/api/usuarios/{usuario_id}", tags=["Usuarios"], summary="Obtener detalle de un usuario")
def get_user_detail(usuario_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, nombre, documento, email, rol, programa, sede, avatar_color, activo, creado_en FROM usuarios WHERE id = %s",
                (usuario_id,),
            )
            user = cursor.fetchone()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
            return {"usuario": user}
    finally:
        conn.close()


@app.post("/api/usuarios", tags=["Usuarios"], status_code=status.HTTP_201_CREATED, summary="Crear usuario (Solo ADMIN)")
def create_user_admin(req: UserRegisterRequest, current_user: dict = Depends(require_roles(["ADMIN"]))):
    return register_user(req)


@app.put("/api/usuarios/{usuario_id}", tags=["Usuarios"], summary="Actualizar usuario (Solo ADMIN)")
def update_user(usuario_id: str, req: UserUpdateRequest, current_user: dict = Depends(require_roles(["ADMIN"]))):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM usuarios WHERE id = %s", (usuario_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

            fields, values = [], []
            if req.nombre is not None:
                fields.append("nombre = %s")
                values.append(req.nombre)
            if req.documento is not None:
                fields.append("documento = %s")
                values.append(req.documento)
            if req.email is not None:
                fields.append("email = %s")
                values.append(req.email)
            if req.password is not None:
                fields.append("password_hash = %s")
                values.append(hash_password(req.password))
            if req.rol is not None:
                fields.append("rol = %s")
                values.append(req.rol)
            if req.programa is not None:
                fields.append("programa = %s")
                values.append(req.programa)
            if req.sede is not None:
                fields.append("sede = %s")
                values.append(req.sede)
            if req.activo is not None:
                fields.append("activo = %s")
                values.append(1 if req.activo else 0)

            if not fields:
                return {"mensaje": "No se enviaron campos para actualizar."}

            values.append(usuario_id)
            cursor.execute(f"UPDATE usuarios SET {', '.join(fields)} WHERE id = %s", tuple(values))

            return {"mensaje": f"Usuario {usuario_id} actualizado con éxito."}
    finally:
        conn.close()


@app.delete("/api/usuarios/{usuario_id}", tags=["Usuarios"], summary="Eliminar/Desactivar usuario (Solo ADMIN)")
def delete_user(usuario_id: str, current_user: dict = Depends(require_roles(["ADMIN"]))):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE usuarios SET activo = 0 WHERE id = %s", (usuario_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
            return {"mensaje": f"Usuario {usuario_id} desactivado correctamente."}
    finally:
        conn.close()


# ==========================================================
# 4. Operaciones CRUD: Sesiones de Clase
# ==========================================================
@app.get("/api/sesiones", tags=["Sesiones de Clase"], summary="Listar sesiones de clase")
def list_sessions(
    activa: Optional[bool] = Query(None, description="Filtrar por sesiones activas"),
    cohorte: Optional[str] = Query(None, description="Filtrar por código de cohorte/ficha"),
    current_user: dict = Depends(get_current_user),
):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT s.id, s.instructor_id, u.nombre as instructor_nombre, s.codigo_cohorte,
                       s.nombre, s.departamento, s.sede, s.aula, s.fecha, s.hora_inicio, s.hora_fin,
                       s.activa, s.geocerca_metros, s.gracia_minutos, s.creado_en
                FROM sesiones s
                LEFT JOIN usuarios u ON s.instructor_id = u.id
                WHERE 1=1
            """
            params = []
            if activa is not None:
                query += " AND s.activa = %s"
                params.append(1 if activa else 0)
            if cohorte:
                query += " AND s.codigo_cohorte = %s"
                params.append(cohorte)

            query += " ORDER BY s.fecha DESC, s.hora_inicio DESC"
            cursor.execute(query, tuple(params))
            sesiones = cursor.fetchall()
            return {"total": len(sesiones), "sesiones": sesiones}
    finally:
        conn.close()


@app.get("/api/sesiones/{sesion_id}", tags=["Sesiones de Clase"], summary="Detalle completo de sesión con asistencias")
def get_session_detail(sesion_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.*, u.nombre as instructor_nombre, u.email as instructor_email
                FROM sesiones s
                LEFT JOIN usuarios u ON s.instructor_id = u.id
                WHERE s.id = %s
                """,
                (sesion_id,),
            )
            session = cursor.fetchone()
            if not session:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada.")

            # Obtener registros de asistencia asociados
            cursor.execute(
                """
                SELECT a.id, a.aprendiz_id, u.nombre as aprendiz_nombre, u.documento, u.email,
                       a.estado, a.metodo, a.distancia_metros, a.firma_token, a.nota, a.registrado_en
                FROM asistencias a
                LEFT JOIN usuarios u ON a.aprendiz_id = u.id
                WHERE a.sesion_id = %s
                ORDER BY a.registrado_en ASC
                """,
                (sesion_id,),
            )
            asistencias = cursor.fetchall()

            # Obtener último QR token activo
            cursor.execute(
                """
                SELECT token, expira_en, revocado 
                FROM codigos_qr 
                WHERE sesion_id = %s AND revocado = 0 AND expira_en > NOW()
                ORDER BY creado_en DESC LIMIT 1
                """,
                (sesion_id,),
            )
            qr_actual = cursor.fetchone()

            return {
                "sesion": session,
                "qr_activo": qr_actual,
                "total_asistencias": len(asistencias),
                "asistencias": asistencias,
            }
    finally:
        conn.close()


@app.post("/api/sesiones", tags=["Sesiones de Clase"], status_code=status.HTTP_201_CREATED, summary="Crear sesión de clase")
def create_session(req: SessionCreateRequest, current_user: dict = Depends(require_roles(["ADMIN", "INSTRUCTOR"]))):
    instructor_id = req.instructor_id if (req.instructor_id and current_user["rol"] == "ADMIN") else current_user["id"]
    fecha_sesion = req.fecha or datetime.date.today().isoformat()
    sesion_id = f"ses-{uuid.uuid4().hex[:6]}"

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO sesiones 
                (id, instructor_id, codigo_cohorte, nombre, departamento, sede, aula, fecha, hora_inicio, hora_fin, activa, geocerca_metros, gracia_minutos)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, %s, %s)
                """,
                (
                    sesion_id,
                    instructor_id,
                    req.codigo_cohorte,
                    req.nombre,
                    req.departamento,
                    req.sede,
                    req.aula,
                    fecha_sesion,
                    req.hora_inicio,
                    req.hora_fin,
                    req.geocerca_metros,
                    req.gracia_minutos,
                ),
            )

            # Generar el primer token QR de la sesión
            initial_token = f"ACADEQR:{req.codigo_cohorte}:TK-{uuid.uuid4().hex[:6].upper()}:SEC-001"
            expires = datetime.datetime.now() + datetime.timedelta(seconds=30)
            cursor.execute(
                "INSERT INTO codigos_qr (id, sesion_id, token, expira_en, revocado) VALUES (%s, %s, %s, %s, 0)",
                (f"qr-{uuid.uuid4().hex[:6]}", sesion_id, initial_token, expires),
            )

        return {
            "mensaje": "Sesión creada exitosamente.",
            "sesion_id": sesion_id,
            "token_inicial": initial_token,
        }
    finally:
        conn.close()


@app.put("/api/sesiones/{sesion_id}", tags=["Sesiones de Clase"], summary="Actualizar parámetros de sesión")
def update_session(sesion_id: str, req: SessionUpdateRequest, current_user: dict = Depends(require_roles(["ADMIN", "INSTRUCTOR"]))):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            fields, values = [], []
            if req.nombre is not None:
                fields.append("nombre = %s")
                values.append(req.nombre)
            if req.aula is not None:
                fields.append("aula = %s")
                values.append(req.aula)
            if req.activa is not None:
                fields.append("activa = %s")
                values.append(1 if req.activa else 0)
            if req.geocerca_metros is not None:
                fields.append("geocerca_metros = %s")
                values.append(req.geocerca_metros)
            if req.gracia_minutos is not None:
                fields.append("gracia_minutos = %s")
                values.append(req.gracia_minutos)

            if not fields:
                return {"mensaje": "Sin cambios a aplicar."}

            values.append(sesion_id)
            cursor.execute(f"UPDATE sesiones SET {', '.join(fields)} WHERE id = %s", tuple(values))

            return {"mensaje": f"Sesión {sesion_id} actualizada correctamente."}
    finally:
        conn.close()


@app.delete("/api/sesiones/{sesion_id}", tags=["Sesiones de Clase"], summary="Cerrar/Eliminar sesión")
def delete_session(sesion_id: str, current_user: dict = Depends(require_roles(["ADMIN", "INSTRUCTOR"]))):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE sesiones SET activa = 0 WHERE id = %s", (sesion_id,))
            return {"mensaje": f"Sesión {sesion_id} finalizada y cerrada."}
    finally:
        conn.close()


# ==========================================================
# 5. Motor de Códigos QR Dinámicos (Pillow + QR)
# ==========================================================
@app.post("/api/qr/rotate", tags=["Códigos QR Dinámicos"], summary="Rotar token QR de la sesión en tiempo real")
def rotate_session_qr(req: QrRotateRequest, current_user: dict = Depends(require_roles(["ADMIN", "INSTRUCTOR"]))):
    """
    Revoca los tokens anteriores e inserta un nuevo token criptográfico con expiración en segundos.
    Ideal para la proyección continua en clase y evitar compartir capturas de pantalla fijas.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, codigo_cohorte, activa FROM sesiones WHERE id = %s", (req.sesion_id,))
            session = cursor.fetchone()
            if not session or not session["activa"]:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sesión no encontrada o inactiva.")

            # Revocar tokens anteriores
            cursor.execute("UPDATE codigos_qr SET revocado = 1 WHERE sesion_id = %s", (req.sesion_id,))

            new_token = f"ACADEQR:{session['codigo_cohorte']}:TK-{uuid.uuid4().hex[:6].upper()}:SEC-{datetime.datetime.now().strftime('%S')}"
            expires = datetime.datetime.now() + datetime.timedelta(seconds=req.segundos_validez)
            qr_id = f"qr-{uuid.uuid4().hex[:6]}"

            cursor.execute(
                "INSERT INTO codigos_qr (id, sesion_id, token, expira_en, revocado) VALUES (%s, %s, %s, %s, 0)",
                (qr_id, req.sesion_id, new_token, expires),
            )

            return {
                "mensaje": "Token QR rotado con éxito.",
                "sesion_id": req.sesion_id,
                "token": new_token,
                "expira_en": expires.isoformat(),
                "validez_segundos": req.segundos_validez,
            }
    finally:
        conn.close()


@app.get("/api/qr/active/{sesion_id}", tags=["Códigos QR Dinámicos"], summary="Obtener el QR activo de una sesión")
def get_active_qr(sesion_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT token, expira_en, creado_en 
                FROM codigos_qr 
                WHERE sesion_id = %s AND revocado = 0 AND expira_en > NOW()
                ORDER BY creado_en DESC LIMIT 1
                """,
                (sesion_id,),
            )
            qr = cursor.fetchone()
            if not qr:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay token QR activo para esta sesión. Rótalo.")
            return {"sesion_id": sesion_id, "qr": qr}
    finally:
        conn.close()


@app.post("/api/qr/generate", tags=["Códigos QR Dinámicos"], summary="Generar imagen QR personalizada (PNG en Base64)")
def generate_qr_image(req: QrGenerateRequest):
    """
    Genera la imagen PNG del código QR aplicando estilos visuales institucionales,
    colores personalizados y badge opcional mediante la librería Pillow.
    """
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(req.data)
        qr.make(fit=True)

        img = qr.make_image(fill_color=req.fg_color, back_color=req.bg_color).convert("RGBA")
        img = img.resize((req.size, req.size), Image.Resampling.LANCZOS)

        # Insignia central institucional
        if req.badge_text:
            draw = ImageDraw.Draw(img)
            badge_w = int(req.size * 0.32)
            badge_h = int(req.size * 0.12)
            bx1 = (req.size - badge_w) // 2
            by1 = (req.size - badge_h) // 2
            bx2 = bx1 + badge_w
            by2 = by1 + badge_h

            draw.rounded_rectangle([bx1, by1, bx2, by2], radius=8, fill=(15, 23, 42, 240), outline=(255, 255, 255, 255), width=2)
            try:
                font = ImageFont.load_default()
            except Exception:
                font = None
            draw.text(((bx1 + bx2) // 2, (by1 + by2) // 2), req.badge_text, fill=(255, 255, 255, 255), anchor="mm", font=font)

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {
            "token": req.data,
            "mime": "image/png",
            "base64": f"data:image/png;base64,{b64}",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generando código QR: {str(exc)}")


# ==========================================================
# 6. Operaciones CRUD: Asistencias y Validación en Vivo
# ==========================================================
@app.get("/api/asistencias", tags=["Asistencias"], summary="Listar registros de asistencia (con filtros)")
def list_attendances(
    sesion_id: Optional[str] = Query(None, description="Filtrar por sesión"),
    aprendiz_id: Optional[str] = Query(None, description="Filtrar por aprendiz"),
    estado: Optional[str] = Query(None, description="PRESENTE, TARDANZA, AUSENTE, EXCUSA"),
    current_user: dict = Depends(get_current_user),
):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT a.id, a.sesion_id, s.nombre as sesion_nombre, s.codigo_cohorte,
                       a.aprendiz_id, u.nombre as aprendiz_nombre, u.documento,
                       a.estado, a.metodo, a.distancia_metros, a.firma_token, a.nota, a.fecha_registro, a.registrado_en
                FROM asistencias a
                LEFT JOIN sesiones s ON a.sesion_id = s.id
                LEFT JOIN usuarios u ON a.aprendiz_id = u.id
                WHERE 1=1
            """
            params = []
            if sesion_id:
                query += " AND a.sesion_id = %s"
                params.append(sesion_id)
            if aprendiz_id:
                query += " AND a.aprendiz_id = %s"
                params.append(aprendiz_id)
            if estado:
                query += " AND a.estado = %s"
                params.append(estado.upper())

            # Si es aprendiz, solo ve sus propias asistencias
            if current_user["rol"] == "APRENDIZ":
                query += " AND a.aprendiz_id = %s"
                params.append(current_user["id"])

            query += " ORDER BY a.registrado_en DESC"
            cursor.execute(query, tuple(params))
            records = cursor.fetchall()
            return {"total": len(records), "asistencias": records}
    finally:
        conn.close()


@app.post("/api/asistencias/scan", tags=["Asistencias"], status_code=status.HTTP_201_CREATED, summary="Escanear y validar asistencia QR en tiempo real")
def scan_and_verify_attendance(req: AttendanceScanRequest, current_user: dict = Depends(get_current_user)):
    """
    Valida el token QR escaneado:
    1. Verifica que la sesión esté activa.
    2. Valida la vigencia y no-revocación del token en la base de datos.
    3. Valida el radio de geocerca permitido (GPS).
    4. Determina si el registro entra en margen puntual (PRESENTE) o en margen de gracia (TARDANZA).
    5. Registra o actualiza la asistencia en MySQL.
    """
    aprendiz_id = req.aprendiz_id if (req.aprendiz_id and current_user["rol"] in ["ADMIN", "INSTRUCTOR"]) else current_user["id"]
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Obtener la sesión
            cursor.execute("SELECT * FROM sesiones WHERE id = %s", (req.sesion_id,))
            session = cursor.fetchone()
            if not session:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada.")
            if not session["activa"]:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La sesión ya no está activa para registros.")

            # 2. Validar token QR
            cursor.execute(
                """
                SELECT * FROM codigos_qr 
                WHERE sesion_id = %s AND token = %s AND revocado = 0
                """,
                (req.sesion_id, req.token_qr),
            )
            qr = cursor.fetchone()
            if not qr:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código QR inválido o revocado.")

            # 3. Validar geocerca
            if req.distancia_metros > session["geocerca_metros"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Fuera del radio permitido. Distancia: {req.distancia_metros}m. Máximo permitido: {session['geocerca_metros']}m.",
                )

            # 4. Calcular puntualidad o tardanza
            now = datetime.datetime.now()
            today_str = datetime.date.today().isoformat()
            estado = "PRESENTE"
            nota = None

            # Si la hora actual supera la hora de inicio + minutos de gracia -> TARDANZA
            try:
                hora_inicio = datetime.datetime.combine(datetime.date.today(), datetime.time.fromisoformat(str(session["hora_inicio"])))
                minutos_transcurridos = (now - hora_inicio).total_seconds() / 60
                if minutos_transcurridos > session["gracia_minutos"]:
                    estado = "TARDANZA"
                    nota = f"Registro tardío ({int(minutos_transcurridos)} min transcurridos)"
            except Exception:
                pass

            att_id = f"att-{uuid.uuid4().hex[:6]}"
            token_sig = f"SIG-{req.token_qr[-6:]}"

            # 5. Insertar o actualizar asistencia
            cursor.execute(
                """
                INSERT INTO asistencias 
                (id, sesion_id, aprendiz_id, estado, metodo, distancia_metros, firma_token, nota, fecha_registro, registrado_en)
                VALUES (%s, %s, %s, %s, 'Dynamic QR', %s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE 
                    estado = VALUES(estado),
                    distancia_metros = VALUES(distancia_metros),
                    firma_token = VALUES(firma_token),
                    nota = VALUES(nota),
                    registrado_en = NOW()
                """,
                (att_id, req.sesion_id, aprendiz_id, estado, req.distancia_metros, token_sig, nota, today_str),
            )

            return {
                "verificado": True,
                "mensaje": f"Asistencia registrada con éxito: {estado}",
                "estado": estado,
                "distancia_metros": req.distancia_metros,
                "firma_token": token_sig,
                "fecha": today_str,
            }
    finally:
        conn.close()


@app.put("/api/asistencias/{asistencia_id}", tags=["Asistencias"], summary="Modificar estado de asistencia (Instructor Override)")
def update_attendance_status(asistencia_id: str, req: AttendanceUpdateRequest, current_user: dict = Depends(require_roles(["ADMIN", "INSTRUCTOR"]))):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE asistencias 
                SET estado = %s, nota = COALESCE(%s, nota), metodo = 'INSTRUCTOR_OVERRIDE'
                WHERE id = %s
                """,
                (req.estado, req.nota, asistencia_id),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro de asistencia no encontrado.")

            return {"mensaje": f"Asistencia {asistencia_id} actualizada a {req.estado}."}
    finally:
        conn.close()


@app.delete("/api/asistencias/{asistencia_id}", tags=["Asistencias"], summary="Eliminar registro de asistencia")
def delete_attendance(asistencia_id: str, current_user: dict = Depends(require_roles(["ADMIN", "INSTRUCTOR"]))):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM asistencias WHERE id = %s", (asistencia_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asistencia no encontrada.")
            return {"mensaje": f"Registro de asistencia {asistencia_id} eliminado."}
    finally:
        conn.close()


@app.get("/api/asistencias/resumen/{sesion_id}", tags=["Asistencias"], summary="Obtener métricas y resumen de asistencia de una sesión")
def get_session_attendance_summary(sesion_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT estado, COUNT(*) as cantidad 
                FROM asistencias 
                WHERE sesion_id = %s 
                GROUP BY estado
                """,
                (sesion_id,),
            )
            counts = {row["estado"]: row["cantidad"] for row in cursor.fetchall()}
            presentes = counts.get("PRESENTE", 0)
            tardanzas = counts.get("TARDANZA", 0)
            ausentes = counts.get("AUSENTE", 0)
            excusas = counts.get("EXCUSA", 0)
            total = presentes + tardanzas + ausentes + excusas
            tasa = round(((presentes + tardanzas) / total) * 100, 1) if total > 0 else 0.0

            return {
                "sesion_id": sesion_id,
                "metricas": {
                    "total_registros": total,
                    "presentes": presentes,
                    "tardanzas": tardanzas,
                    "ausentes": ausentes,
                    "excusas": excusas,
                    "tasa_asistencia_pct": tasa,
                },
            }
    finally:
        conn.close()


# ==========================================================
# Ejecución Directa con Uvicorn
# ==========================================================
if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Iniciando AcadeQR Backend REST API en Python...")
    print(f"Documentación Swagger interactiva: http://localhost:8000/docs")
    print(f"Documentación ReDoc: http://localhost:8000/redoc")
    print(f"Base de datos conectada: MySQL en {DB_HOST}:{DB_PORT}/{DB_NAME}")
    print("=" * 60)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
