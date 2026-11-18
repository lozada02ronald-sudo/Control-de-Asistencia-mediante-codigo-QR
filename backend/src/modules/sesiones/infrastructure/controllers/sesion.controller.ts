import { NextFunction, Request, Response } from 'express';
import { Rol } from '@prisma/client';
import { sendCreated, sendSuccess } from '../../../../shared/http/apiResponse.js';
import { UnauthorizedError } from '../../../../shared/errors/AppError.js';
import { ISesionRepository } from '../../domain/ports/sesion.repository.port.js';
import { CrearSesionQRService } from '../../application/services/crear-sesion-qr.service.js';
import { RotarQRService } from '../../application/services/rotar-qr.service.js';
import {
  CrearSesionBody,
  ListarSesionesQuery,
  RotarQRBody,
} from '../../application/schemas/sesion.schema.js';

export class SesionController {
  constructor(
    private readonly crearSesionQRService: CrearSesionQRService,
    private readonly rotarQRService: RotarQRService,
    private readonly sesionRepository: ISesionRepository,
  ) {}

  listarSesiones = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { page, limit } = req.query as unknown as ListarSesionesQuery;
      const result = await this.sesionRepository.listarPaginadas({
        instructorId: req.user.rol === Rol.ADMIN ? undefined : req.user.sub,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      });

      return sendSuccess(res, result, 'Sesiones obtenidas correctamente');
    } catch (error) {
      return next(error);
    }
  };

  crearSesion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const body = req.body as CrearSesionBody;
      const result = await this.crearSesionQRService.execute({
        instructorId: req.user.sub,
        nombreClase: body.nombreClase,
        ttlSegundos: body.ttlSegundos,
      });

      return sendCreated(res, result, 'Sesión y código QR creados correctamente');
    } catch (error) {
      return next(error);
    }
  };

  rotarQR = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const { sesionId } = req.params as { sesionId: string };
      const body = req.body as RotarQRBody;

      const qr = await this.rotarQRService.execute({
        sesionId,
        instructorId: req.user.sub,
        esAdmin: req.user.rol === Rol.ADMIN,
        ttlSegundos: body.ttlSegundos,
      });

      return sendCreated(res, qr, 'Nuevo código QR generado correctamente');
    } catch (error) {
      return next(error);
    }
  };
}

