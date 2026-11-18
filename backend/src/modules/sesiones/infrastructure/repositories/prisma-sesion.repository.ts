import { PrismaClient } from '@prisma/client';
import {
  CrearQRParaSesionData,
  CrearSesionConQRData,
  ISesionRepository,
} from '../../domain/ports/sesion.repository.port.js';

export class PrismaSesionRepository implements ISesionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async crearConQR(data: CrearSesionConQRData) {
    return this.prisma.$transaction(async (tx) => {
      const sesion = await tx.sesion.create({
        data: {
          instructorId: data.instructorId,
          nombre: data.nombreClase,
        },
      });

      const qr = await tx.codigoQR.create({
        data: {
          sesionId: sesion.id,
          token: data.tokenQR,
          expiraEn: data.expiraEn,
        },
      });

      return { sesion, qr };
    });
  }

  async buscarPorId(sesionId: string) {
    return this.prisma.sesion.findUnique({
      where: { id: sesionId },
    });
  }

  async agregarNuevoQR(data: CrearQRParaSesionData) {
    return this.prisma.codigoQR.create({
      data: {
        sesionId: data.sesionId,
        token: data.tokenQR,
        expiraEn: data.expiraEn,
      },
    });
  }

  async listarPaginadas(params: { instructorId?: string; page: number; limit: number }) {
    const where = params.instructorId ? { instructorId: params.instructorId } : {};
    const skip = (params.page - 1) * params.limit;

    // Peticiones independientes en paralelo + select explícito + _count (evita N+1)
    const [rows, total] = await Promise.all([
      this.prisma.sesion.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { fecha: 'desc' },
        select: {
          id: true,
          nombre: true,
          fecha: true,
          activa: true,
          _count: { select: { asistencias: true } },
        },
      }),
      this.prisma.sesion.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        fecha: row.fecha,
        activa: row.activa,
        totalAsistencias: row._count.asistencias,
      })),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
}

