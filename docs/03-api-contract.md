# Contrato de API REST (`AcadeQR`)

> **Base URL Local:** `http://localhost:4000`  
> **Documentación Interactiva (Swagger UI):** `GET /api/docs`  
> **Especificación OpenAPI 3.0 (JSON):** `GET /api/docs.json`  
> **Autenticación:** `Authorization: Bearer <JWT>`

---

## 1. Sistema y Salud
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Público | Verifica estado del servidor y conexión Redis (`connected` / `fallback`). |
| `GET` | `/api/docs` | Público | Interfaz interactiva Swagger UI. |
| `GET` | `/api/docs.json` | Público | Esquema OpenAPI 3.0 en formato JSON. |

---

## 2. Autenticación y Recuperación (`/api/auth`)
Todos los endpoints de autenticación están protegidos con *Rate Limiting* en Redis (`429 Too Many Requests`), validación **Zod**, hashing `crypto.scrypt` con *salt* aleatorio y comparación `timingSafeEqual`.

| Método | Endpoint | Body | Respuesta |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | `{ nombre, email, password, rol }` | `201` `{ token, user }` |
| `POST` | `/api/auth/login` | `{ email, password }` | `200` `{ token, user }` / `401` |
| `POST` | `/api/auth/recover-account` | `{ nombre }` | `200` `{ found, maskedEmail, rol }` |
| `POST` | `/api/auth/forgot-password` | `{ email }` | `200` `{ ttlSeconds: 300 }` (OTP en Redis) |
| `POST` | `/api/auth/reset-password` | `{ email, otp, newPassword }` | `200` Contraseña actualizada |

---

## 3. CRUD de Usuarios (`/api/usuarios`)
| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/usuarios/me` | Todos (autenticado) | Perfil del usuario actual (con caché Redis). |
| `GET` | `/api/usuarios?rol=&activo=` | `ADMIN`, `INSTRUCTOR` | Listar usuarios y aprendices filtrados. |
| `POST` | `/api/usuarios` | `ADMIN`, `INSTRUCTOR` | Crear usuario (`INSTRUCTOR` solo crea `APRENDIZ`). |
| `PATCH` | `/api/usuarios/:id` | `ADMIN` | Actualizar `nombre`, `rol` o `activo`. |
| `DELETE` | `/api/usuarios/:id` | `ADMIN` | Desactivar usuario (`activo = false`). |

---

## 4. CRUD de Sesiones y QR Dinámico (`/api/sesiones`)
| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/sesiones?page=1&limit=10` | `INSTRUCTOR`, `ADMIN` | Listar sesiones paginadas. |
| `GET` | `/api/sesiones/:sesionId` | `INSTRUCTOR`, `ADMIN` | Obtener detalle de sesión + último QR. |
| `POST` | `/api/sesiones` | `INSTRUCTOR`, `ADMIN` | Crear sesión atómica + QR inicial (`ttlSegundos` 10–7200). |
| `PATCH` | `/api/sesiones/:sesionId` | `INSTRUCTOR`, `ADMIN` | Actualizar `nombre` o `activa`. |
| `PATCH` | `/api/sesiones/:sesionId/cerrar` | `INSTRUCTOR`, `ADMIN` | Cerrar sesión y revocar QRs activos. |
| `DELETE` | `/api/sesiones/:sesionId` | `INSTRUCTOR`, `ADMIN` | Eliminar sesión y registros asociados. |
| `POST` | `/api/sesiones/:sesionId/qr` | `INSTRUCTOR`, `ADMIN` | Rotar token QR dinámico (cacheado en Redis). |

---

## 5. CRUD de Asistencias y Escaneo QR (`/api/asistencias`)
| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/asistencias/escanear` | `APRENDIZ`, `INSTRUCTOR`, `ADMIN` | Valida firma QR, vigencia, sesión activa y unicidad (`409` si duplicado). |
| `GET` | `/api/asistencias/mias` | Todos (autenticado) | Historial personal de asistencias del usuario. |
| `GET` | `/api/asistencias/sesion/:sesionId` | `INSTRUCTOR`, `ADMIN` | Listado completo (Roster) de la sesión. |
| `PATCH` | `/api/asistencias/:id` | `INSTRUCTOR`, `ADMIN` | Ajuste manual de `estado` (`PRESENTE`, `TARDANZA`, `AUSENTE`, `EXCUSA`). |
| `DELETE` | `/api/asistencias/:id` | `ADMIN` | Eliminar registro de asistencia. |
