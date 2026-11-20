import { Router } from 'express';
import { EstadoAsistencia, Rol } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { requireAuth, requireRole } from '../../infrastructure/http/middlewares/authMiddleware.js';
import { validateRequest } from '../../infrastructure/http/middlewares/validateRequest.js';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors/AppError.js';
import { sendCreated, sendSuccess } from '../../shared/http/apiResponse.js';

export const asistenciaRouter = Router();

const escanearSchema = z.object({
  body: z.object({
    tokenQR: z.string().trim().min(10, 'tokenQR inválido'),
    tardanza: z.boolean().optional().default(false),
  }),
});

const sesionParamSchema = z.object({
  params: z.object({
    sesionId: z.string().uuid('sesionId debe ser un UUID válido'),
  }),
});

const actualizarAsistenciaSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de asistencia inválido'),
  }),
  body: z.object({
    estado: z.nativeEnum(EstadoAsistencia),
  }),
});

const asistenciaIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de asistencia inválido'),
  }),
});

asistenciaRouter.use(requireAuth);

// Registrar asistencia escaneando código QR dinámico
asistenciaRouter.post(
  '/escanear',
  requireRole(Rol.APRENDIZ, Rol.INSTRUCTOR, Rol.ADMIN),
  validateRequest(escanearSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { tokenQR, tardanza } = req.body as { tokenQR: string; tardanza: boolean };

      try {
        jwt.verify(tokenQR, env.QR_SECRET);
      } catch {
        throw new AppError('Firma QR inválida o token expirado', 400);
      }

      const codigo = await prisma.codigoQR.findUnique({
        where: { token: tokenQR },
        include: { sesion: true },
      });

      if (!codigo) {
        throw new NotFoundError('Código QR no encontrado');
      }
      if (codigo.revocado) {
        throw new AppError('Este código QR fue revocado', 400);
      }
      if (codigo.expiraEn.getTime() < Date.now()) {
        throw new AppError('El código QR ha expirado', 400);
      }
      if (!codigo.sesion.activa) {
        throw new ConflictError('La sesión ya fue cerrada por el instructor');
      }

      const existing = await prisma.asistencia.findUnique({
        where: {
          sesionId_aprendizId: {
            sesionId: codigo.sesionId,
            aprendizId: req.user.sub,
          },
        },
      });
      if (existing) {
        throw new ConflictError('Ya registraste tu asistencia en esta sesión');
      }

      const asistencia = await prisma.asistencia.create({
        data: {
          sesionId: codigo.sesionId,
          aprendizId: req.user.sub,
          estado: tardanza ? EstadoAsistencia.TARDANZA : EstadoAsistencia.PRESENTE,
        },
        include: {
          sesion: { select: { id: true, nombre: true, fecha: true } },
        },
      });

      return sendCreated(res, asistencia, 'Asistencia registrada correctamente');
    } catch (error) {
      return next(error);
    }
  }
);

// Historial personal de asistencias del usuario autenticado
asistenciaRouter.get('/mias', async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const registros = await prisma.asistencia.findMany({
      where: { aprendizId: req.user.sub },
      orderBy: { registradoEn: 'desc' },
      include: {
        sesion: { select: { id: true, nombre: true, fecha: true, activa: true } },
      },
    });
    return sendSuccess(res, registros, 'Historial personal obtenido correctamente');
  } catch (error) {
    return next(error);
  }
});

// Listado (Roster) de una sesión para Instructor propietario o Admin
asistenciaRouter.get(
  '/sesion/:sesionId',
  requireRole(Rol.INSTRUCTOR, Rol.ADMIN),
  validateRequest(sesionParamSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { sesionId } = req.params as { sesionId: string };
      const sesion = await prisma.sesion.findUnique({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundError('Sesión no encontrada');

      if (req.user.rol !== Rol.ADMIN && sesion.instructorId !== req.user.sub) {
        throw new ForbiddenError('Solo el instructor propietario o Admin puede ver este listado');
      }

      const registros = await prisma.asistencia.findMany({
        where: { sesionId },
        orderBy: { registradoEn: 'asc' },
        include: {
          aprendiz: { select: { id: true, nombre: true, email: true, rol: true } },
        },
      });
      return sendSuccess(res, registros, 'Listado de asistencia obtenido correctamente');
    } catch (error) {
      return next(error);
    }
  }
);

// Ajuste manual de estado de asistencia (INSTRUCTOR o ADMIN)
asistenciaRouter.patch(
  '/:id',
  requireRole(Rol.INSTRUCTOR, Rol.ADMIN),
  validateRequest(actualizarAsistenciaSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params as { id: string };
      const { estado } = req.body as { estado: EstadoAsistencia };

      const registro = await prisma.asistencia.findUnique({
        where: { id },
        include: { sesion: true },
      });
      if (!registro) throw new NotFoundError('Registro de asistencia no encontrado');

      if (req.user.rol !== Rol.ADMIN && registro.sesion.instructorId !== req.user.sub) {
        throw new ForbiddenError('No tienes permisos para modificar esta asistencia');
      }

      const updated = await prisma.asistencia.update({
        where: { id },
        data: { estado },
      });
      return sendSuccess(res, updated, 'Estado de asistencia actualizado');
    } catch (error) {
      return next(error);
    }
  }
);

// Eliminar registro de asistencia (solo ADMIN)
asistenciaRouter.delete(
  '/:id',
  requireRole(Rol.ADMIN),
  validateRequest(asistenciaIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const exists = await prisma.asistencia.findUnique({ where: { id } });
      if (!exists) throw new NotFoundError('Registro de asistencia no encontrado');

      await prisma.asistencia.delete({ where: { id } });
      return sendSuccess(res, { id, deleted: true }, 'Registro de asistencia eliminado');
    } catch (error) {
      return next(error);
    }
  }
);
