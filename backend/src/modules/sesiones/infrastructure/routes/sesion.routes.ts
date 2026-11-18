import { Router } from 'express';
import { Rol } from '@prisma/client';
import { env } from '../../../../config/env.js';
import { prisma } from '../../../../infrastructure/database/prisma.js';
import { requireAuth, requireRole } from '../../../../infrastructure/http/middlewares/authMiddleware.js';
import { validateRequest } from '../../../../infrastructure/http/middlewares/validateRequest.js';
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

sesionRouter.get('/', validateRequest(listarSesionesRequestSchema), sesionController.listarSesiones);
sesionRouter.post('/', validateRequest(crearSesionRequestSchema), sesionController.crearSesion);
sesionRouter.post('/:sesionId/qr', validateRequest(rotarQRRequestSchema), sesionController.rotarQR);

