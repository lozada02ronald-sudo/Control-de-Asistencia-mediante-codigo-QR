import { Router } from 'express';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { redisCache } from '../../infrastructure/cache/redisClient.js';
import { requireAuth, requireRole } from '../../infrastructure/http/middlewares/authMiddleware.js';
import { validateRequest } from '../../infrastructure/http/middlewares/validateRequest.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { sendCreated, sendSuccess } from '../../shared/http/apiResponse.js';
import { hashPassword } from '../auth/password.util.js';

export const usuarioRouter = Router();

const listarUsuariosSchema = z.object({
  query: z.object({
    rol: z.nativeEnum(Rol).optional(),
    activo: z.enum(['true', 'false']).optional(),
  }),
});

const crearUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string().trim().min(3, 'Nombre demasiado corto').max(120),
    email: z.string().trim().email('Correo inválido').toLowerCase(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
    rol: z.nativeEnum(Rol).default(Rol.APRENDIZ),
  }),
});

const actualizarUsuarioSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de usuario inválido'),
  }),
  body: z.object({
    nombre: z.string().trim().min(3).max(120).optional(),
    rol: z.nativeEnum(Rol).optional(),
    activo: z.boolean().optional(),
  }),
});

const usuarioIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de usuario inválido'),
  }),
});

usuarioRouter.use(requireAuth);

// Perfil propio (cualquier rol autenticado)
usuarioRouter.get('/me', async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const cached = await redisCache.get(`user:profile:${req.user.sub}`);
    if (cached) {
      return sendSuccess(res, JSON.parse(cached), 'Perfil obtenido desde caché Redis');
    }

    const user = await prisma.usuario.findUnique({
      where: { id: req.user.sub },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
    });
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return sendSuccess(res, user, 'Perfil obtenido correctamente');
  } catch (error) {
    return next(error);
  }
});

// Listar usuarios / aprendices (ADMIN o INSTRUCTOR)
usuarioRouter.get(
  '/',
  requireRole(Rol.ADMIN, Rol.INSTRUCTOR),
  validateRequest(listarUsuariosSchema),
  async (req, res, next) => {
    try {
      const { rol, activo } = req.query as { rol?: Rol; activo?: string };
      const users = await prisma.usuario.findMany({
        where: {
          rol: rol ?? undefined,
          activo: activo !== undefined ? activo === 'true' : undefined,
        },
        orderBy: { creadoEn: 'desc' },
        select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
      });
      return sendSuccess(res, users, 'Usuarios obtenidos correctamente');
    } catch (error) {
      return next(error);
    }
  }
);

// Crear usuario (ADMIN o INSTRUCTOR)
usuarioRouter.post(
  '/',
  requireRole(Rol.ADMIN, Rol.INSTRUCTOR),
  validateRequest(crearUsuarioSchema),
  async (req, res, next) => {
    try {
      const { nombre, email, password, rol } = req.body as {
        nombre: string;
        email: string;
        password: string;
        rol: Rol;
      };

      const existing = await prisma.usuario.findUnique({ where: { email } });
      if (existing) {
        throw new ConflictError('Ya existe un usuario con ese correo electrónico');
      }

      const safeRol = req.user?.rol === Rol.ADMIN ? rol : Rol.APRENDIZ;
      const passwordHash = await hashPassword(password);
      const created = await prisma.usuario.create({
        data: { nombre, email, passwordHash, rol: safeRol },
        select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
      });

      return sendCreated(res, created, 'Usuario creado correctamente');
    } catch (error) {
      return next(error);
    }
  }
);

// Actualizar usuario (solo ADMIN)
usuarioRouter.patch(
  '/:id',
  requireRole(Rol.ADMIN),
  validateRequest(actualizarUsuarioSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as { nombre?: string; rol?: Rol; activo?: boolean };
      const exists = await prisma.usuario.findUnique({ where: { id } });
      if (!exists) throw new NotFoundError('Usuario no encontrado');

      const updated = await prisma.usuario.update({
        where: { id },
        data: body,
        select: { id: true, nombre: true, email: true, rol: true, activo: true, actualizadoEn: true },
      });
      await redisCache.del(`user:profile:${id}`);
      return sendSuccess(res, updated, 'Usuario actualizado correctamente');
    } catch (error) {
      return next(error);
    }
  }
);

// Desactivar usuario (solo ADMIN)
usuarioRouter.delete(
  '/:id',
  requireRole(Rol.ADMIN),
  validateRequest(usuarioIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const exists = await prisma.usuario.findUnique({ where: { id } });
      if (!exists) throw new NotFoundError('Usuario no encontrado');

      const deactivated = await prisma.usuario.update({
        where: { id },
        data: { activo: false },
        select: { id: true, email: true, activo: true },
      });
      await redisCache.del(`user:profile:${id}`);
      return sendSuccess(res, deactivated, 'Usuario desactivado correctamente');
    } catch (error) {
      return next(error);
    }
  }
);
