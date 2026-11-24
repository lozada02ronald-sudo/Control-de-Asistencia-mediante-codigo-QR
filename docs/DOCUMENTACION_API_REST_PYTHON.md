# AcadeQR — Documentación Técnica de la API RESTful en Python

**Sistema Institucional de Control de Asistencia mediante Código QR Dinámico**  
*Desarrollado con Python 3, FastAPI, PyMySQL, Bcrypt, PyJWT, Pillow y Base de Datos MySQL en XAMPP.*

---

## 1. Arquitectura y Tecnologías

| Componente | Tecnología | Descripción |
| :--- | :--- | :--- |
| **Lenguaje** | Python 3.13+ | Entorno de ejecución principal |
| **Framework Web** | FastAPI + Uvicorn | API REST de alto rendimiento con validación tipada |
| **Base de Datos** | MySQL 8.4 (XAMPP) | Motor relacional (`acadeqr_db`) en puerto 3306 |
| **Driver BD** | PyMySQL | Conector nativo de Python a MySQL |
| **Autenticación** | PyJWT + Bcrypt | Tokens Bearer JWT (24h) y cifrado seguro de contraseñas |
| **Generador QR** | Pillow + qrcode | Creación de imágenes PNG con estilo institucional |
| **Documentación** | OpenAPI / Swagger UI | Interfaz interactiva en `/docs` y ReDoc en `/redoc` |

---

## 2. Puesta en Marcha Rápida

### A. Iniciar Base de Datos en XAMPP
1. Abre **XAMPP Control Panel**.
2. Haz clic en **Start** en el módulo **MySQL** (puerto `3306`).
3. *(Opcional)* Si aún no has creado la base de datos, ejecuta:
   ```bash
   python backend/init_db.py
   ```

### B. Iniciar el Servidor de la API
Ejecuta el archivo por lotes en la raíz o desde la terminal:
```bash
python backend/app.py
```
O directamente con Uvicorn:
```bash
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

- **Swagger UI Interactivo:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Alternativo:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Endpoint de Salud:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 3. Matriz de Roles y Autorización (RBAC)

El sistema implementa control de acceso basado en tres roles:
- **`ADMIN`**: Acceso total al sistema, creación y modificación de usuarios y sesiones.
- **`INSTRUCTOR`**: Creación y control de sesiones, rotación de códigos QR, anulación o modificación manual de asistencias (*Instructor Override*).
- **`APRENDIZ`**: Escaneo y registro de asistencia propia mediante código QR con validación de geocerca GPS.

---

## 4. Usuarios Semilla Preconfigurados

| Rol | Nombre | Correo Electrónico | Contraseña |
| :--- | :--- | :--- | :--- |
| **ADMIN** | Coordinador Académico General | `admin@acadeqr.edu.co` | `Admin123!` |
| **INSTRUCTOR** | Ing. Mateo Restrepo | `mateo.restrepo@sena.edu.co` | `123456` |
| **INSTRUCTOR** | Inst. Carolina Suárez | `carolina.suarez@sena.edu.co` | `123456` |
| **APRENDIZ** | Camila Mendoza Ruiz | `camila.mendoza@soy.sena.edu.co` | `123456` |
| **APRENDIZ** | Santiago Vargas Gil | `santiago.vargas@soy.sena.edu.co` | `123456` |

---

## 5. Catálogo Completo de Endpoints

### 🔐 Módulo 1: Autenticación & Autorización

#### `POST /api/auth/login`
- **Descripción:** Autentica credenciales y genera un token JWT Bearer.
- **Payload:**
  ```json
  {
    "email": "admin@acadeqr.edu.co",
    "password": "Admin123!"
  }
  ```
- **Respuesta (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "usuario": {
      "id": "usr-admin-01",
      "nombre": "Coordinador Académico General",
      "email": "admin@acadeqr.edu.co",
      "rol": "ADMIN"
    }
  }
  ```

#### `POST /api/auth/register`
- **Descripción:** Registro de un nuevo usuario en la base de datos MySQL.
- **Payload:**
  ```json
  {
    "nombre": "Estefanía Olaya",
    "documento": "CC 1.025.889.102",
    "email": "estefania.olaya@soy.sena.edu.co",
    "password": "ClaveSegura123",
    "rol": "APRENDIZ",
    "programa": "Tecnología en Desarrollo de Software",
    "sede": "Sede Central"
  }
  ```

#### `GET /api/auth/me`
- **Descripción:** Retorna el perfil completo del usuario autenticado actual.
- **Header:** `Authorization: Bearer <TOKEN_JWT>`

---

### 👥 Módulo 2: CRUD de Usuarios

| Método | Endpoint | Rol Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/usuarios` | `ADMIN`, `INSTRUCTOR` | Listado de usuarios con filtros por `rol` y búsqueda `q` |
| `GET` | `/api/usuarios/{usuario_id}` | Autenticado | Detalle individual de un usuario |
| `POST` | `/api/usuarios` | `ADMIN` | Registro administrativo de un usuario |
| `PUT` | `/api/usuarios/{usuario_id}` | `ADMIN` | Actualización de datos, rol o estado activo |
| `DELETE` | `/api/usuarios/{usuario_id}` | `ADMIN` | Desactivación lógica del usuario |

---

### 🏫 Módulo 3: CRUD de Sesiones de Clase

| Método | Endpoint | Rol Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/sesiones` | Autenticado | Listar sesiones con filtro de `activa` y `cohorte` |
| `GET` | `/api/sesiones/{sesion_id}` | Autenticado | Detalle de sesión con asistencias y último token QR |
| `POST` | `/api/sesiones` | `ADMIN`, `INSTRUCTOR` | Crear una nueva sesión con geocerca y margen de gracia |
| `PUT` | `/api/sesiones/{sesion_id}` | `ADMIN`, `INSTRUCTOR` | Modificar aula, geocerca, minutos de gracia o estado |
| `DELETE` | `/api/sesiones/{sesion_id}` | `ADMIN`, `INSTRUCTOR` | Cerrar y finalizar la sesión de clase |

**Payload Ejemplo Creación de Sesión (`POST /api/sesiones`):**
```json
{
  "codigo_cohorte": "COH-2841",
  "nombre": "Mecatrónica Industrial y Control PLC",
  "departamento": "Automatización",
  "sede": "Sede Técnica Norte",
  "aula": "Taller B-204",
  "hora_inicio": "08:00:00",
  "hora_fin": "12:00:00",
  "geocerca_metros": 50,
  "gracia_minutos": 15
}
```

---

### 📱 Módulo 4: Códigos QR Dinámicos

#### `POST /api/qr/rotate`
- **Descripción:** Revoca tokens anteriores y genera un nuevo token criptográfico temporal para proyección en vivo.
- **Payload:**
  ```json
  {
    "sesion_id": "ses-2841",
    "segundos_validez": 30
  }
  ```

#### `GET /api/qr/active/{sesion_id}`
- **Descripción:** Retorna el token QR activo no revocado y vigente en la base de datos.

#### `POST /api/qr/generate`
- **Descripción:** Genera visualmente la imagen PNG del código QR institucional en formato Base64.
- **Payload:**
  ```json
  {
    "data": "ACADEQR:COH-2841:TK-882194:SEC-104",
    "fg_color": "#006948",
    "bg_color": "#ffffff",
    "size": 420,
    "badge_text": "ACADEQR"
  }
  ```

---

### 📋 Módulo 5: Asistencias y Validación en Tiempo Real

#### `POST /api/asistencias/scan`
- **Descripción:** Valida el escaneo del código QR, comprueba la geocerca GPS y registra la asistencia.
- **Payload:**
  ```json
  {
    "sesion_id": "ses-2841",
    "token_qr": "ACADEQR:COH-2841:TK-882194:SEC-104",
    "distancia_metros": 14
  }
  ```
- **Respuesta (201 Created):**
  ```json
  {
    "verificado": true,
    "mensaje": "Asistencia registrada con éxito: PRESENTE",
    "estado": "PRESENTE",
    "distancia_metros": 14,
    "firma_token": "SIG-EC-104",
    "fecha": "2026-11-24"
  }
  ```

#### `PUT /api/asistencias/{asistencia_id}`
- **Descripción:** Sobrescritura manual por parte del instructor (*Instructor Override*).
- **Payload:**
  ```json
  {
    "estado": "EXCUSA",
    "nota": "Presentó incapacidad médica institucional"
  }
  ```

#### `GET /api/asistencias/resumen/{sesion_id}`
- **Descripción:** Retorna el consolidado analítico de asistencia de la clase.
- **Respuesta:**
  ```json
  {
    "sesion_id": "ses-2841",
    "metricas": {
      "total_registros": 10,
      "presentes": 7,
      "tardanzas": 1,
      "ausentes": 2,
      "excusas": 0,
      "tasa_asistencia_pct": 80.0
    }
  }
  ```
