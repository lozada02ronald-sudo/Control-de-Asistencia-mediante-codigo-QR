# Plan y Casos de Prueba (Test Cases)

> **Alcance:** Autenticación/RBAC, Generación y Rotación de QR Dinámico, y Flujo de Escaneo de Asistencia.

---

## 1. Casos de Prueba — Autenticación y RBAC

| ID | Título | Precondiciones | Pasos a Ejecutar | Datos de Prueba | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CP-AUTH-01** | Acceso sin token JWT | Backend ejecutándose en puerto `4000`. | Enviar `POST /api/sesiones` sin header `Authorization`. | Body: `{"nombreClase":"Base de Datos"}` | HTTP `401 Unauthorized` con `error.code = "UNAUTHORIZED"`. |
| **CP-AUTH-02** | Acceso con token expirado o manipulado | Contar con un JWT vencido o alterado. | Enviar `POST /api/sesiones` con `Authorization: Bearer <token_invalido>`. | Body: `{"nombreClase":"Base de Datos"}` | HTTP `401 Unauthorized` (`"Token inválido o expirado"`). |
| **CP-AUTH-03** | Rol `APRENDIZ` intenta crear sesión | Usuario autenticado con `rol = "APRENDIZ"`. | Enviar `POST /api/sesiones` con JWT de aprendiz. | Body: `{"nombreClase":"Base de Datos"}` | HTTP `403 Forbidden` (`"No tienes permisos para este recurso"`). |

---

## 2. Casos de Prueba — Generación y Rotación de QR Dinámico

| ID | Título | Precondiciones | Pasos a Ejecutar | Datos de Prueba | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CP-QR-01** | Creación exitosa de sesión y QR | Usuario autenticado con `rol = "INSTRUCTOR"` existente en tabla `usuarios`. | Enviar `POST /api/sesiones`. | `{"nombreClase":"Node.js Avanzado","ttlSegundos":60}` | HTTP `201 Created`. Devuelve `data.sesion` (`activa: true`) y `data.qr.token` con `expiraEn` a +60s. |
| **CP-QR-02** | Validación Zod: nombre muy corto | Usuario autenticado `INSTRUCTOR`. | Enviar `POST /api/sesiones` con `nombreClase` de 2 caracteres. | `{"nombreClase":"BD"}` | HTTP `400 Bad Request` con `error.code = "VALIDATION_ERROR"`. |
| **CP-QR-03** | Validación Zod: TTL fuera de rango | Usuario autenticado `INSTRUCTOR`. | Enviar `POST /api/sesiones` con `ttlSegundos` menor a 10. | `{"nombreClase":"Seguridad","ttlSegundos":5}` | HTTP `400 Bad Request` (`"El TTL mínimo es de 10 segundos"`). |
| **CP-QR-04** | Rotación de QR por propietario | Sesión activa creada por Instructor A. | Enviar `POST /api/sesiones/{sesionId}/qr` con JWT de Instructor A. | `{"ttlSegundos":45}` | HTTP `201 Created`. Genera nuevo `CodigoQR` vinculado a `sesionId` con nuevo `token`. |
| **CP-QR-05** | Rotación de QR por otro instructor | Sesión activa creada por Instructor A. | Enviar `POST /api/sesiones/{sesionId}/qr` con JWT de Instructor B (`INSTRUCTOR`). | `{"ttlSegundos":45}` | HTTP `403 Forbidden` (`"Solo el instructor propietario puede rotar el QR de esta sesión"`). |
| **CP-QR-06** | Rotación en sesión inexistente | Usuario `INSTRUCTOR` o `ADMIN`. | Enviar `POST /api/sesiones/{uuid_inexistente}/qr`. | `sesionId = "00000000-0000-0000-0000-000000000000"` | HTTP `404 Not Found` (`"Sesión no encontrada"`). |
| **CP-QR-07** | Rotación en sesión cerrada | Sesión existente con `activa = false`. | Enviar `POST /api/sesiones/{sesionId}/qr`. | `{"ttlSegundos":60}` | HTTP `409 Conflict` (`"No se puede generar un QR para una sesión cerrada"`). |

---

## 3. Casos de Prueba — Escaneo de Asistencia (Flujo E2E)

> **Nota:** Los casos `CP-ESC-01` a `CP-ESC-04` cubren la UI actual (`ScannerScreen.tsx`) y el contrato proyectado para `POST /api/asistencias/escanear`.

| ID | Título | Precondiciones | Pasos a Ejecutar | Datos de Prueba | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CP-ESC-01** | Escaneo exitoso dentro del TTL | Sesión activa con QR vigente; usuario `APRENDIZ` autenticado. | 1. Abrir `ScannerScreen` en móvil.<br>2. Escanear QR vigente.<br>3. Enviar token al backend. | `tokenQR` emitido hace < `ttlSegundos`. | Registro creado en `asistencias` (`estado = PRESENTE`). UI muestra confirmación visual de éxito. |
| **CP-ESC-02** | Escaneo con QR expirado | QR emitido hace > `ttlSegundos`. | 1. Escanear o enviar `tokenQR` vencido. | `tokenQR` con `expiraEn < now()`. | Backend rechaza el registro (error `400`/`401` QR expirado). UI muestra alerta no bloqueante. |
| **CP-ESC-03** | Doble escaneo del mismo aprendiz | El aprendiz ya registró asistencia en `sesionId`. | 1. Volver a escanear un QR vigente de la misma sesión. | Mismo `aprendizId` y `sesionId`. | Restricción `UNIQUE (sesion_id, aprendiz_id)` impide duplicado; backend responde `409 Conflict`. |
| **CP-ESC-04** | Token QR alterado o firma inválida | Cualquier usuario `APRENDIZ`. | Enviar cadena modificada manualmente en lugar de un JWT firmado con `QR_SECRET`. | `tokenQR = "token-falso-123"` | Verificación de firma falla; backend rechaza con `401`/`400` sin crear registro. |

