import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env.js';
import { errorHandler } from './infrastructure/http/middlewares/errorHandler.js';
import { requestTimeout } from './infrastructure/http/middlewares/requestTimeout.js';
import { sesionRouter } from './modules/sesiones/infrastructure/routes/sesion.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { redisCache } from './infrastructure/cache/redisClient.js';

export const app = express();

app.use(helmet());
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

app.use('/api/auth', authRouter);
app.use('/api/sesiones', sesionRouter);

app.use(errorHandler);

