import { NextFunction, Request, Response } from 'express';

/**
 * Corta peticiones HTTP que excedan el umbral definido para evitar
 * bloqueos de recursos ante APIs o consultas lentas.
 */
export function requestTimeout(timeoutMs = 10_000) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'La solicitud superó el tiempo máximo permitido',
          },
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

