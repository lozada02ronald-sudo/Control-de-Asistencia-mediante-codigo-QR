# Contrato de API REST (API Contract)

> **Base URL (desarrollo):** `http://localhost:4000`  
> **Formato de intercambio:** `application/json; charset=utf-8`

---

## 1. Headers Requeridos y Convenciones

### Headers HTTP
| Header | Obligatorio | Valor / Formato | Uso |
| :--- | :--- | :--- | :--- |
| `Content-Type` | Sí (en `POST`/`PATCH`) | `application/json` | Indica cuerpo JSON válido. |
| `Authorization` | Sí (rutas protegidas) | `Bearer <JWT_TOKEN>` | Autenticación y extracción de `sub` y `rol`. |

### Formato Estandarizado de Respuesta Exitosa
```json
{
  "success": true,
  "message": "Descripción de la operación",
  "data": {}
}
```

### Formato Estandarizado de Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción legible del error",
    "details": {}
  }
}
```

---

## 2. Endpoints Implementados

### 2.1 Verificación de Estado (`GET /health`)
- **Acceso:** Público.
- **Respuesta `200 OK`:**
```json
{
  "success": true,
  "status": "ok"
}
```

---

### 2.2 Crear Sesión y QR Inicial (`POST /api/sesiones`)
- **Acceso:** `INSTRUCTOR`, `ADMIN` (requiere `Authorization: Bearer <token>`).
- **Esquema Zod del Body (`crearSesionRequestSchema`):**

| Campo | Tipo | Reglas Zod | Default |
| :--- | :--- | :--- | :--- |
| `nombreClase` | `string` | `.trim().min(3).max(120)` | Requerido |
| `ttlSegundos` | `number` | `.int().min(10).max(7200)` | `60` |

- **Ejemplo de Request:**
```json
{
  "nombreClase": "Arquitectura de Software - Ficha 2841",
  "ttlSegundos": 60
}
```

- **Respuesta `201 Created`:**
```json
{
  "success": true,
  "message": "Sesión y código QR creados correctamente",
  "data": {
    "sesion": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "instructorId": "9a1f8c20-1122-4455-8899-aabbccddeeff",
      "nombre": "Arquitectura de Software - Ficha 2841",
      "fecha": "2026-11-13T14:10:00.000Z",
      "activa": true
    },
    "qr": {
      "id": "7b2e1100-3344-4555-9999-112233445566",
      "sesionId": "550e8400-e29b-41d4-a716-446655440000",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiraEn": "2026-11-13T14:11:00.000Z",
      "revocado": false,
      "creadoEn": "2026-11-13T14:10:00.000Z"
    }
  }
}
```

---

### 2.3 Rotar Código QR Dinámico (`POST /api/sesiones/:sesionId/qr`)
- **Acceso:** `INSTRUCTOR` (propietario de la sesión) o `ADMIN`.
- **Parámetros de Ruta (`params`):**
  - `sesionId`: `string` (UUID válido).
- **Esquema Zod del Body (`rotarQRRequestSchema`):**

| Campo | Tipo | Reglas Zod | Default |
| :--- | :--- | :--- | :--- |
| `ttlSegundos` | `number` | `.int().min(10).max(7200)` | `60` |

- **Respuesta `201 Created`:**
```json
{
  "success": true,
  "message": "Nuevo código QR generado correctamente",
  "data": {
    "id": "8c3f2200-4455-4666-8888-223344556677",
    "sesionId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiraEn": "2026-11-13T14:12:00.000Z",
    "revocado": false,
    "creadoEn": "2026-11-13T14:11:00.000Z"
  }
}
```

---

## 3. Catálogo de Respuestas de Error (`4xx` / `5xx`)

| Código HTTP | `error.code` | Cuándo ocurre | Ejemplo de Respuesta |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Falla validación Zod en `body`, `params` o `query`. | `{"success":false,"error":{"code":"VALIDATION_ERROR","message":"Error de validación en los datos enviados","details":{"nombreClase":["El nombre de la clase debe tener al menos 3 caracteres"]}}}` |
| `401 Unauthorized` | `UNAUTHORIZED` | Falta header `Authorization` o el JWT es inválido/expirado. | `{"success":false,"error":{"code":"UNAUTHORIZED","message":"Token inválido o expirado"}}` |
| `403 Forbidden` | `FORBIDDEN` | Usuario con rol `APRENDIZ` o instructor distinto al propietario. | `{"success":false,"error":{"code":"FORBIDDEN","message":"No tienes permisos para este recurso"}}` |
| `404 Not Found` | `NOT_FOUND` | El `sesionId` no existe en base de datos. | `{"success":false,"error":{"code":"NOT_FOUND","message":"Sesión no encontrada"}}` |
| `409 Conflict` | `CONFLICT` / `DUPLICATE_RECORD` | Sesión cerrada al rotar QR, o registro único duplicado (`P2002`). | `{"success":false,"error":{"code":"CONFLICT","message":"No se puede generar un QR para una sesión cerrada"}}` |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | Excepción no controlada o fallo de conexión a PostgreSQL. | `{"success":false,"error":{"code":"INTERNAL_SERVER_ERROR","message":"Error interno del servidor"}}` |

---

## 4. Endpoints Proyectados (Siguiente Iteración)

> Estos endpoints forman parte del alcance del SRS, pero **aún no están implementados** en `backend/src/`:

| Método y Ruta | Rol Permitido | Descripción |
| :--- | :--- | :--- |
| `POST /api/auth/login` | Público | Autentica credenciales y devuelve JWT (`sub`, `rol`). |
| `POST /api/asistencias/escanear` | `APRENDIZ` | Recibe `{ tokenQR }`, valida firma/TTL/no-revocación y crea registro en `asistencias`. |
| `GET /api/sesiones/:sesionId/asistencias` | `INSTRUCTOR`, `ADMIN` | Lista los registros de asistencia de la sesión. |
| `PATCH /api/sesiones/:sesionId/cerrar` | `INSTRUCTOR`, `ADMIN` | Marca `activa = false` en la sesión. |

