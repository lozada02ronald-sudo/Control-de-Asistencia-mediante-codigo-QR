import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env.js';
import { errorHandler } from './infrastructure/http/middlewares/errorHandler.js';
import { requestTimeout } from './infrastructure/http/middlewares/requestTimeout.js';
import { sesionRouter } from './modules/sesiones/infrastructure/routes/sesion.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usuarioRouter } from './modules/usuarios/usuario.routes.js';
import { asistenciaRouter } from './modules/asistencias/asistencia.routes.js';
import { redisCache } from './infrastructure/cache/redisClient.js';
import { openApiSpec } from './docs/openapi.js';

export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '16kb' }));
app.use(requestTimeout(10_000));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    redis: redisCache.isRedisReady() ? 'connected' : 'fallback',
  });
});

app.get('/api/docs.json', (_req, res) => {
  res.json(openApiSpec);
});

app.get('/api/docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>AcadeQR API Docs (Swagger)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/api/docs.json', dom_id: '#swagger-ui' });
  </script>
</body>
</html>`);
});

app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuarioRouter);
app.use('/api/sesiones', sesionRouter);
app.use('/api/asistencias', asistenciaRouter);

app.use(errorHandler);

