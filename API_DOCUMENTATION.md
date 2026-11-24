# AcadeQR · Documentación Técnica de API REST Institucional
> **Sistema de Gestión de Asistencia mediante Códigos QR**  
> Proyecto Formativo: **Análisis y Desarrollo de Software (ADSO) — SENA**  
> Servidor REST: **FastAPI + PyMySQL + MySQL (XAMPP) + JWT + Bcrypt + Pillow**

---

## 1. Arquitectura y Acceso a la Documentación Interactiva

La plataforma cuenta con un backend RESTful desacoplado, seguro y de alto rendimiento:

* **Servidor de API:** `http://localhost:8000`
* **Documentación Interactiva Swagger (OpenAPI 3.0):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Documentación ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Frontend Web React:** `http://localhost:3000`
* **Base de Datos:** MySQL / MariaDB en XAMPP (`localhost:3306`), esquema `acadeqr_db`.

---

## 2. Autenticación y Autorización (RBAC)

El sistema implementa un modelo de seguridad basado en tokens de acceso **JWT (JSON Web Token)** con firma `HS256` y expiración a 24 horas, complementado con hashing criptográfico de contraseñas mediante **Bcrypt con sal única**.

### Encabezado Requerido para Rutas Protegidas
```http
Authorization: Bearer <TU_TOKEN_JWT>
```

### Roles y Jerarquía de Permisos
| Rol | Alcance y Permisos |
|---|---|
| `ADMIN` | Control total: gestión de usuarios, auditoría forense, configuración global y exportación. |
| `INSTRUCTOR` | Creación y control de sesiones, proyección de QR dinámico, anulación manual y reportes. |
| `APRENDIZ` | Escaneo en aula, consulta de asistencias propias y carnet estudiantil digital. |

---

## 3. Catálogo de Endpoints REST

### 3.1. Salud y Diagnóstico
* `GET /api/health`
  * **Descripción:** Comprueba el estado operativo del motor Python y la conexión activa con las tablas de MySQL en XAMPP.
  * **Autenticación:** Pública.

---

### 3.2. Módulo de Autenticación (`/api/auth`)
* `POST /api/auth/register`
  * **Descripción:** Registra un nuevo usuario con contraseña encriptada en Bcrypt.
  * **Body (JSON):**
    ```json
    {
      "nombre": "Estefanía Olaya",
      "documento": "CC 1.025.889.102",
      "email": "estefania.adso@soy.sena.edu.co",
      "password": "Password123!",
      "rol": "APRENDIZ",
      "programa": "Tecnología en Análisis y Desarrollo de Software",
      "sede": "Sede Central"
    }
    ```
  * **Respuesta 201:** Retorna `access_token` JWT y objeto del usuario.

* `POST /api/auth/login`
  * **Descripción:** Autentica credenciales contra MySQL y emite Bearer Token.
  * **Body (JSON):**
    ```json
    {
      "email": "estefania.adso@soy.sena.edu.co",
      "password": "Password123!"
    }
    ```
  * **Respuesta 200:** Retorna `access_token` y perfil del usuario.

* `GET /api/auth/me`
  * **Descripción:** Devuelve los datos del perfil activo extrayendo la identidad del token Bearer.
  * **Autenticación:** Requiere Bearer JWT.

* `POST /api/auth/forgot-password`
  * **Descripción:** Solicitud de código OTP y actualización de contraseña para recuperación de cuenta.
  * **Body (JSON):** `{"email": "usuario@sena.edu.co", "new_password": "NuevaClave123!"}`

---

### 3.3. CRUD de Usuarios (`/api/usuarios`)
* `GET /api/usuarios`
  * **Descripción:** Lista usuarios registrados. Permite filtrar por query parameters: `?rol=APRENDIZ&q=Estefania`.
  * **Permiso:** Requiere rol `ADMIN` o `INSTRUCTOR`.
* `GET /api/usuarios/{usuario_id}`
  * **Descripción:** Consulta el detalle individual de un usuario por su ID.
  * **Permiso:** Requiere sesión autenticada.
* `POST /api/usuarios`
  * **Descripción:** Creación directa de usuarios administrativos, docentes o aprendices.
  * **Permiso:** Requiere rol `ADMIN`.
* `PUT /api/usuarios/{usuario_id}`
  * **Descripción:** Actualiza campos de usuario (nombre, email, contraseña, rol, estado activo).
  * **Permiso:** Requiere rol `ADMIN`.
* `DELETE /api/usuarios/{usuario_id}`
  * **Descripción:** Desactiva lógicamente al usuario (`activo = 0`).
  * **Permiso:** Requiere rol `ADMIN`.

---

### 3.4. CRUD de Sesiones de Clase (`/api/sesiones`)
* `GET /api/sesiones`
  * **Descripción:** Listado de sesiones académicas. Filtros opcionales: `?activa=true&cohorte=COH-2841`.
  * **Permiso:** Requiere sesión autenticada.
* `GET /api/sesiones/{sesion_id}`
  * **Descripción:** Detalle completo de la sesión, incluyendo instructor, asistencias y token QR vigente.
  * **Permiso:** Requiere sesión autenticada.
* `POST /api/sesiones`
  * **Descripción:** Apertura de nueva clase con definición de geocerca (metros) y margen de gracia (minutos).
  * **Body (JSON):**
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
  * **Permiso:** Requiere rol `ADMIN` o `INSTRUCTOR`.
* `PUT /api/sesiones/{sesion_id}`
  * **Descripción:** Actualiza aula, margen de gracia, radio de geocerca o estado activo.
  * **Permiso:** Requiere rol `ADMIN` o `INSTRUCTOR`.
* `DELETE /api/sesiones/{sesion_id}`
  * **Descripción:** Cierra la sesión (`activa = 0`) para bloquear nuevos escaneos.
  * **Permiso:** Requiere rol `ADMIN` o `INSTRUCTOR`.

---

### 3.5. Motor de Códigos QR Dinámicos (`/api/qr`)
* `POST /api/qr/rotate`
  * **Descripción:** Invalida atómicamente el token QR previo de la sesión y genera un nuevo token criptográfico temporal con vigencia en segundos.
  * **Body (JSON):** `{"sesion_id": "ses-2841", "segundos_validez": 30}`
  * **Permiso:** Requiere rol `ADMIN` o `INSTRUCTOR`.
* `GET /api/qr/active/{sesion_id}`
  * **Descripción:** Consulta el token QR actualmente proyectado y su tiempo de expiración.
  * **Autenticación:** Pública / Proyector.
* `POST /api/qr/generate`
  * **Descripción:** Renderiza en el servidor una imagen PNG en Base64 con Pillow, soporte para badge institucional y colores de contraste alto.
  * **Body (JSON):** `{"data": "ACADEQR:COH-2841:TK-882194", "fg_color": "#142B49", "bg_color": "#ffffff", "size": 420, "badge_text": "ACADEQR"}`

---

### 3.6. CRUD y Validación de Asistencias (`/api/asistencias`)
* `GET /api/asistencias`
  * **Descripción:** Lista registros de asistencia. Filtros: `?sesion_id=ses-2841&estado=PRESENTE`.
  * **Seguridad:** Los aprendices solo pueden ver sus propios registros; instructores y administradores ven el listado completo.
* `POST /api/asistencias/scan`
  * **Descripción:** Validación rigurosa de escaneo en tiempo real:
    1. Verifica que la sesión esté abierta.
    2. Valida la firma del token QR y que no haya expirado ni sido revocado.
    3. Comprueba el perímetro GPS (`distancia_metros <= geocerca_metros`).
    4. Computa automáticamente `PRESENTE` o `TARDANZA` según los minutos de gracia.
    5. Guarda el registro en MySQL evitando duplicados (`ON DUPLICATE KEY UPDATE`).
* `POST /api/attendance/register`
  * **Descripción:** Endpoint directo para el escáner del frontend con sincronización automática de sesión y aprendiz.
* `PUT /api/asistencias/{asistencia_id}`
  * **Descripción:** Modificación manual justificada de estado (`PRESENTE`, `TARDANZA`, `AUSENTE`, `EXCUSA`) por parte del instructor (*Instructor Override*).
  * **Permiso:** Requiere rol `ADMIN` o `INSTRUCTOR`.
* `DELETE /api/asistencias/{asistencia_id}`
  * **Descripción:** Elimina un registro de asistencia.
  * **Permiso:** Requiere rol `ADMIN` o `INSTRUCTOR`.
* `GET /api/asistencias/resumen/{sesion_id}`
  * **Descripción:** Retorna agregados estadísticos en tiempo real: conteo de presentes, tardanzas, ausentes, excusas y porcentaje de asistencia.

---

## 4. Guía Rápida de Pruebas con cURL

```bash
# 1. Comprobar salud del backend y MySQL
curl -X GET http://localhost:8000/api/health

# 2. Registrar usuario de prueba
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan Pérez","email":"juan@sena.edu.co","password":"ClaveSegura123","rol":"APRENDIZ"}'

# 3. Iniciar sesión y obtener JWT
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@sena.edu.co","password":"ClaveSegura123"}'

# 4. Probar endpoint protegido con el Token recibido
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <PEGAR_TOKEN_AQUI>"
```
