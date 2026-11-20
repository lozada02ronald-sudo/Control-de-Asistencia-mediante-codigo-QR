import { Router } from 'express';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../../../config/env.js';
import { prisma } from '../../../../infrastructure/database/prisma.js';
import { requireAuth, requireRole } from '../../../../infrastructure/http/middlewares/authMiddleware.js';
import { validateRequest } from '../../../../infrastructure/http/middlewares/validateRequest.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../../../shared/errors/AppError.js';
import { sendSuccess } from '../../../../shared/http/apiResponse.js';
import {
  crearSesionRequestSchema,
  listarSesionesRequestSchema,
  rotarQRRequestSchema,
} from '../../application/schemas/sesion.schema.js';
import { CrearSesionQRService } from '../../application/services/crear-sesion-qr.service.js';
import { RotarQRService } from '../../application/services/rotar-qr.service.js';
import { PrismaSesionRepository } from '../repositories/prisma-sesion.repository.js';
import { SesionController } from '../controllers/sesion.controller.js';

const sesionRepository = new PrismaSesionRepository(prisma);
const crearSesionQRService = new CrearSesionQRService(sesionRepository, env.QR_SECRET);
const rotarQRService = new RotarQRService(sesionRepository, env.QR_SECRET);
const sesionController = new SesionController(
  crearSesionQRService,
  rotarQRService,
  sesionRepository,
);

export const sesionRouter = Router();

sesionRouter.use(requireAuth, requireRole(Rol.INSTRUCTOR, Rol.ADMIN));

const sesionIdParamsSchema = z.object({
  params: z.object({
    sesionId: z.string().uuid('sesionId debe ser un UUID válido'),
  }),
});

const actualizarSesionSchema = z.object({
  params: z.object({
    sesionId: z.string().uuid('sesionId debe ser un UUID válido'),
  }),
  body: z.object({
    nombre: z.string().trim().min(3).max(160).optional(),
    activa: z.boolean().optional(),
  }),
});

sesionRouter.get('/', validateRequest(listarSesionesRequestSchema), sesionController.listarSesiones);
sesionRouter.post('/', validateRequest(crearSesionRequestSchema), sesionController.crearSesion);
sesionRouter.post('/:sesionId/qr', validateRequest(rotarQRRequestSchema), sesionController.rotarQR);

sesionRouter.get(
  '/:sesionId',
  validateRequest(sesionIdParamsSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { sesionId } = req.params as { sesionId: string };
      const sesion = await prisma.sesion.findUnique({
        where: { id: sesionId },
        include: {
          qrs: { orderBy: { creadoEn: 'desc' }, take: 1 },
          _count: { select: { asistencias: true } },
        },
      });
      if (!sesion) throw new NotFoundError('Sesión no encontrada');
      if (req.user.rol !== Rol.ADMIN && sesion.instructorId !== req.user.sub) {
        throw new ForbiddenError('No tienes acceso a esta sesión');
      }
      return sendSuccess(res, sesion, 'Sesión obtenida correctamente');
    } catch (error) {
      return next(error);
    }
  }
);

sesionRouter.patch(
  '/:sesionId',
  validateRequest(actualizarSesionSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { sesionId } = req.params as { sesionId: string };
      const body = req.body as { nombre?: string; activa?: boolean };

      const sesion = await prisma.sesion.findUnique({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundError('Sesión no encontrada');
      if (req.user.rol !== Rol.ADMIN && sesion.instructorId !== req.user.sub) {
        throw new ForbiddenError('Solo el propietario o un administrador puede modificar la sesión');
      }

      const updated = await prisma.sesion.update({
        where: { id: sesionId },
        data: body,
      });
      return sendSuccess(res, updated, 'Sesión actualizada correctamente');
    } catch (error) {
      return next(error);
    }
  }
);

sesionRouter.patch(
  '/:sesionId/cerrar',
  validateRequest(sesionIdParamsSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { sesionId } = req.params as { sesionId: string };

      const sesion = await prisma.sesion.findUnique({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundError('Sesión no encontrada');
      if (req.user.rol !== Rol.ADMIN && sesion.instructorId !== req.user.sub) {
        throw new ForbiddenError('Solo el propietario o un administrador puede cerrar la sesión');
      }

      const closed = await prisma.$transaction(async (tx) => {
        await tx.codigoQR.updateMany({
          where: { sesionId, revocado: false },
          data: { revocado: true },
        });
        return tx.sesion.update({
          where: { id: sesionId },
          data: { activa: false },
        });
      });

      return sendSuccess(res, closed, 'Sesión cerrada y códigos QR revocados');
    } catch (error) {
      return next(error);
    }
  }
);

sesionRouter.delete(
  '/:sesionId',
  validateRequest(sesionIdParamsSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { sesionId } = req.params as { sesionId: string };

      const sesion = await prisma.sesion.findUnique({ where: { id: sesionId } });
      if (!sesion) throw new NotFoundError('Sesión no encontrada');
      if (req.user.rol !== Rol.ADMIN && sesion.instructorId !== req.user.sub) {
        throw new ForbiddenError('No tienes permisos para eliminar esta sesión');
      }

      await prisma.$transaction(async (tx) => {
        await tx.asistencia.deleteMany({ where: { sesionId } });
        await tx.codigoQR.deleteMany({ where: { sesionId } });
        await tx.sesion.delete({ where: { id: sesionId } });
      });

      return sendSuccess(res, { id: sesionId, deleted: true }, 'Sesión eliminada correctamente');
    } catch (error) {
      return next(error);
    }
  }
);

