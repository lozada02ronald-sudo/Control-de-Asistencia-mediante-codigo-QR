import { ConflictError, ForbiddenError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { redisCache } from '../../../../infrastructure/cache/redisClient.js';
import { ISesionRepository } from '../../domain/ports/sesion.repository.port.js';
import { generarTokenQR } from './crear-sesion-qr.service.js';

export interface RotarQRInput {
  sesionId: string;
  instructorId: string;
  esAdmin: boolean;
  ttlSegundos: number;
}

export class RotarQRService {
  constructor(
    private readonly sesionRepo: ISesionRepository,
    private readonly qrSecret: string,
  ) {}

  async execute(input: RotarQRInput) {
    const sesion = await this.sesionRepo.buscarPorId(input.sesionId);
    if (!sesion) {
      throw new NotFoundError('Sesión no encontrada');
    }

    if (!input.esAdmin && sesion.instructorId !== input.instructorId) {
      throw new ForbiddenError('Solo el instructor propietario puede rotar el QR de esta sesión');
    }

    if (!sesion.activa) {
      throw new ConflictError('No se puede generar un QR para una sesión cerrada');
    }

    const { tokenQR, expiraEn } = generarTokenQR(sesion.id, sesion.instructorId, input.ttlSegundos, this.qrSecret);

    const created = await this.sesionRepo.agregarNuevoQR({
      sesionId: sesion.id,
      tokenQR,
      expiraEn,
    });

    await redisCache.set(
      `qr:active:${sesion.id}`,
      JSON.stringify({ tokenQR, expiraEn: expiraEn.toISOString() }),
      input.ttlSegundos
    );

    return created;
  }
}

