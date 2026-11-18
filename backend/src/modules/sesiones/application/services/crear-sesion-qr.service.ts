import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ISesionRepository } from '../../domain/ports/sesion.repository.port.js';

export interface CrearSesionQRInput {
  instructorId: string;
  nombreClase: string;
  ttlSegundos: number;
}

export function generarTokenQR(sesionReferencia: string, instructorId: string, ttlSegundos: number, qrSecret: string) {
  const expiraEn = new Date(Date.now() + ttlSegundos * 1000);
  const tokenQR = jwt.sign(
    {
      jti: crypto.randomUUID(),
      ref: sesionReferencia,
      instructorId,
      type: 'qr_asistencia',
    },
    qrSecret,
    { expiresIn: ttlSegundos },
  );
  return { tokenQR, expiraEn };
}

export class CrearSesionQRService {
  constructor(
    private readonly sesionRepo: ISesionRepository,
    private readonly qrSecret: string,
  ) {}

  async execute(input: CrearSesionQRInput) {
    const sesionRef = crypto.randomUUID();
    const { tokenQR, expiraEn } = generarTokenQR(sesionRef, input.instructorId, input.ttlSegundos, this.qrSecret);

    return this.sesionRepo.crearConQR({
      instructorId: input.instructorId,
      nombreClase: input.nombreClase,
      tokenQR,
      expiraEn,
    });
  }
}

