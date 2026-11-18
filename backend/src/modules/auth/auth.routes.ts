import crypto from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../infrastructure/database/prisma.js';
import { redisCache } from '../../infrastructure/cache/redisClient.js';
import { rateLimiter } from '../../infrastructure/http/middlewares/rateLimitMiddleware.js';
import { validateRequest } from '../../infrastructure/http/middlewares/validateRequest.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendCreated, sendSuccess } from '../../shared/http/apiResponse.js';
import {
  forgotPasswordSchema,
  loginSchema,
  recoverAccountSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import { hashPassword, maskEmail, verifyPassword } from './password.util.js';

export const authRouter = Router();

const OTP_TTL_SECONDS = 300; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;

authRouter.post(
  '/login',
  rateLimiter({ keyPrefix: 'login', maxAttempts: 5, windowSeconds: 900 }),
  validateRequest(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const user = await prisma.usuario.findUnique({ where: { email } });

      if (!user || !user.activo) {
        throw new AppError('Credenciales inválidas', 401);
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        throw new AppError('Credenciales inválidas', 401);
      }

      const token = jwt.sign(
        { sub: user.id, rol: user.rol },
        env.JWT_SECRET,
        { expiresIn: '8h', jwtid: crypto.randomUUID() }
      );

      // Cache active user profile briefly for fast session checks
      await redisCache.set(
        `user:profile:${user.id}`,
        JSON.stringify({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }),
        300
      );

      return sendSuccess(res, {
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

authRouter.post(
  '/register',
  rateLimiter({ keyPrefix: 'register', maxAttempts: 5, windowSeconds: 900 }),
  validateRequest(registerSchema),
  async (req, res, next) => {
    try {
      const { nombre, email, password, rol } = req.body as {
        nombre: string;
        email: string;
        password: string;
        rol: 'APRENDIZ' | 'INSTRUCTOR';
      };

      const existing = await prisma.usuario.findUnique({ where: { email } });
      if (existing) {
        throw new AppError('No se pudo completar el registro con ese correo', 409);
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.usuario.create({
        data: { nombre, email, passwordHash, rol },
        select: { id: true, nombre: true, email: true, rol: true },
      });

      const token = jwt.sign(
        { sub: user.id, rol: user.rol },
        env.JWT_SECRET,
        { expiresIn: '8h', jwtid: crypto.randomUUID() }
      );

      return sendCreated(res, { token, user });
    } catch (err) {
      return next(err);
    }
  }
);

authRouter.post(
  '/recover-account',
  rateLimiter({ keyPrefix: 'recover_acct', maxAttempts: 5, windowSeconds: 900 }),
  validateRequest(recoverAccountSchema),
  async (req, res, next) => {
    try {
      const { nombre } = req.body as { nombre: string };
      const user = await prisma.usuario.findFirst({
        where: {
          nombre: { contains: nombre, mode: 'insensitive' },
          activo: true,
        },
        select: { email: true, rol: true },
      });

      return sendSuccess(res, {
        found: Boolean(user),
        maskedEmail: user ? maskEmail(user.email) : null,
        rol: user ? user.rol : null,
        message: user
          ? 'Cuenta localizada. Usa el correo enmascarado para iniciar sesión o restablecer contraseña.'
          : 'Si existe una cuenta con ese nombre, verás una pista de recuperación.',
      });
    } catch (err) {
      return next(err);
    }
  }
);

authRouter.post(
  '/forgot-password',
  rateLimiter({ keyPrefix: 'forgot_pw', maxAttempts: 3, windowSeconds: 900 }),
  validateRequest(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body as { email: string };
      const user = await prisma.usuario.findUnique({
        where: { email },
        select: { id: true, activo: true },
      });

      if (user && user.activo) {
        const otp = String(crypto.randomInt(100000, 999999));
        await redisCache.set(
          `otp:${email}`,
          JSON.stringify({ otp, attempts: 0 }),
          OTP_TTL_SECONDS
        );
      }

      return sendSuccess(res, {
        ttlSeconds: OTP_TTL_SECONDS,
        message: 'Si el correo está registrado, se ha generado un código OTP de 6 dígitos válido por 5 minutos.',
      });
    } catch (err) {
      return next(err);
    }
  }
);

authRouter.post(
  '/reset-password',
  rateLimiter({ keyPrefix: 'reset_pw', maxAttempts: 5, windowSeconds: 900 }),
  validateRequest(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { email, otp, newPassword } = req.body as {
        email: string;
        otp: string;
        newPassword: string;
      };

      const raw = await redisCache.get(`otp:${email}`);
      if (!raw) {
        throw new AppError('El código OTP expiró o es inválido', 400);
      }

      const record = JSON.parse(raw) as { otp: string; attempts: number };
      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        await redisCache.del(`otp:${email}`);
        throw new AppError('Código bloqueado por demasiados intentos fallidos', 429);
      }

      const otpBuffer = Buffer.from(otp);
      const storedBuffer = Buffer.from(record.otp);
      const isMatch =
        otpBuffer.length === storedBuffer.length &&
        crypto.timingSafeEqual(otpBuffer, storedBuffer);

      if (!isMatch) {
        const remainingTtl = await redisCache.ttl(`otp:${email}`);
        await redisCache.set(
          `otp:${email}`,
          JSON.stringify({ otp: record.otp, attempts: record.attempts + 1 }),
          remainingTtl > 0 ? remainingTtl : OTP_TTL_SECONDS
        );
        throw new AppError('Código OTP incorrecto', 400);
      }

      const passwordHash = await hashPassword(newPassword);
      await prisma.usuario.update({
        where: { email },
        data: { passwordHash },
      });

      await redisCache.del(`otp:${email}`);
      return sendSuccess(res, { message: 'Contraseña actualizada de forma segura.' });
    } catch (err) {
      return next(err);
    }
  }
);

