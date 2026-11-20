export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AcadeQR API REST',
    version: '2.0.0',
    description:
      'API REST para control de asistencia académica mediante códigos QR dinámicos, autenticación JWT, RBAC, caché Redis y CRUD completo.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Servidor Local' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Estado de salud de la API y Redis',
        responses: { '200': { description: 'Servidor operativo' } },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar usuario (APRENDIZ o INSTRUCTOR)',
        responses: { '201': { description: 'Usuario creado y JWT emitido' }, '409': { description: 'Correo duplicado' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión y obtener JWT',
        responses: { '200': { description: 'Login exitoso' }, '401': { description: 'Credenciales inválidas' }, '429': { description: 'Bloqueo por rate limit' } },
      },
    },
    '/api/auth/recover-account': {
      post: {
        tags: ['Autenticación'],
        summary: 'Localizar cuenta por nombre (devuelve correo enmascarado)',
        responses: { '200': { description: 'Resultado de búsqueda' } },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Autenticación'],
        summary: 'Generar código OTP de 6 dígitos en Redis (TTL 5 min)',
        responses: { '200': { description: 'OTP generado' } },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Autenticación'],
        summary: 'Restablecer contraseña verificando OTP',
        responses: { '200': { description: 'Contraseña actualizada' }, '400': { description: 'OTP inválido o expirado' } },
      },
    },
    '/api/usuarios/me': {
      get: {
        tags: ['Usuarios'],
        security: [{ bearerAuth: [] }],
        summary: 'Obtener perfil del usuario autenticado',
        responses: { '200': { description: 'Perfil de usuario' } },
      },
    },
    '/api/usuarios': {
      get: {
        tags: ['Usuarios'],
        security: [{ bearerAuth: [] }],
        summary: 'Listar usuarios/aprendices (INSTRUCTOR, ADMIN)',
        responses: { '200': { description: 'Lista de usuarios' } },
      },
      post: {
        tags: ['Usuarios'],
        security: [{ bearerAuth: [] }],
        summary: 'Crear usuario (INSTRUCTOR, ADMIN)',
        responses: { '201': { description: 'Usuario creado' } },
      },
    },
    '/api/usuarios/{id}': {
      patch: {
        tags: ['Usuarios'],
        security: [{ bearerAuth: [] }],
        summary: 'Actualizar usuario (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Usuario actualizado' } },
      },
      delete: {
        tags: ['Usuarios'],
        security: [{ bearerAuth: [] }],
        summary: 'Desactivar usuario (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Usuario desactivado' } },
      },
    },
    '/api/sesiones': {
      get: {
        tags: ['Sesiones'],
        security: [{ bearerAuth: [] }],
        summary: 'Listar sesiones paginadas (INSTRUCTOR, ADMIN)',
        responses: { '200': { description: 'Sesiones listadas' } },
      },
      post: {
        tags: ['Sesiones'],
        security: [{ bearerAuth: [] }],
        summary: 'Crear sesión y código QR inicial (INSTRUCTOR, ADMIN)',
        responses: { '201': { description: 'Sesión y QR creados' } },
      },
    },
    '/api/sesiones/{sesionId}': {
      get: {
        tags: ['Sesiones'],
        security: [{ bearerAuth: [] }],
        summary: 'Obtener detalle de una sesión (INSTRUCTOR, ADMIN)',
        parameters: [{ name: 'sesionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Detalle de sesión' } },
      },
      patch: {
        tags: ['Sesiones'],
        security: [{ bearerAuth: [] }],
        summary: 'Actualizar sesión (INSTRUCTOR, ADMIN)',
        parameters: [{ name: 'sesionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Sesión actualizada' } },
      },
      delete: {
        tags: ['Sesiones'],
        security: [{ bearerAuth: [] }],
        summary: 'Eliminar sesión (INSTRUCTOR propietario o ADMIN)',
        parameters: [{ name: 'sesionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Sesión eliminada' } },
      },
    },
    '/api/sesiones/{sesionId}/qr': {
      post: {
        tags: ['Sesiones'],
        security: [{ bearerAuth: [] }],
        summary: 'Rotar token QR dinámico de la sesión',
        parameters: [{ name: 'sesionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '201': { description: 'Nuevo QR emitido' } },
      },
    },
    '/api/sesiones/{sesionId}/cerrar': {
      patch: {
        tags: ['Sesiones'],
        security: [{ bearerAuth: [] }],
        summary: 'Cerrar sesión y revocar códigos QR activos',
        parameters: [{ name: 'sesionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Sesión cerrada' } },
      },
    },
    '/api/asistencias/escanear': {
      post: {
        tags: ['Asistencias'],
        security: [{ bearerAuth: [] }],
        summary: 'Registrar asistencia mediante token QR dinámico',
        responses: { '201': { description: 'Asistencia registrada' }, '409': { description: 'Asistencia duplicada' } },
      },
    },
    '/api/asistencias/mias': {
      get: {
        tags: ['Asistencias'],
        security: [{ bearerAuth: [] }],
        summary: 'Consultar historial personal de asistencias',
        responses: { '200': { description: 'Historial obtenido' } },
      },
    },
    '/api/asistencias/sesion/{sesionId}': {
      get: {
        tags: ['Asistencias'],
        security: [{ bearerAuth: [] }],
        summary: 'Consultar listado de asistencia de una sesión (INSTRUCTOR, ADMIN)',
        parameters: [{ name: 'sesionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Listado obtenido' } },
      },
    },
    '/api/asistencias/{id}': {
      patch: {
        tags: ['Asistencias'],
        security: [{ bearerAuth: [] }],
        summary: 'Actualizar estado de asistencia manualmente (INSTRUCTOR, ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Estado actualizado' } },
      },
      delete: {
        tags: ['Asistencias'],
        security: [{ bearerAuth: [] }],
        summary: 'Eliminar registro de asistencia (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Registro eliminado' } },
      },
    },
  },
};
