import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { env } from '../../../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/AppError.js';

export interface AuthUser {
  sub: string;
  rol: Rol;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token de autenticación requerido'));
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    if (!decoded.sub || !decoded.rol) {
      return next(new UnauthorizedError('Token inválido'));
    }
    req.user = decoded;
    return next();
  } catch {
    return next(new UnauthorizedError('Token inválido o expirado'));
  }
}

export function requireRole(...allowedRoles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Usuario no autenticado'));
    }
    if (!allowedRoles.includes(req.user.rol)) {
      return next(new ForbiddenError('No tienes permisos para este recurso'));
    }
    return next();
  };
}

