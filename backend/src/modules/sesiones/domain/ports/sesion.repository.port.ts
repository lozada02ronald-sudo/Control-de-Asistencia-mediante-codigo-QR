export interface SesionEntity {
  id: string;
  instructorId: string;
  nombre: string;
  fecha: Date;
  activa: boolean;
}

export interface CodigoQREntity {
  id: string;
  sesionId: string;
  token: string;
  expiraEn: Date;
  revocado: boolean;
  creadoEn: Date;
}

export interface CrearSesionConQRData {
  instructorId: string;
  nombreClase: string;
  tokenQR: string;
  expiraEn: Date;
}

export interface CrearQRParaSesionData {
  sesionId: string;
  tokenQR: string;
  expiraEn: Date;
}

export interface SesionResumenItem {
  id: string;
  nombre: string;
  fecha: Date;
  activa: boolean;
  totalAsistencias: number;
}

export interface ListarSesionesPaginadasResult {
  items: SesionResumenItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ISesionRepository {
  crearConQR(data: CrearSesionConQRData): Promise<{ sesion: SesionEntity; qr: CodigoQREntity }>;
  buscarPorId(sesionId: string): Promise<SesionEntity | null>;
  agregarNuevoQR(data: CrearQRParaSesionData): Promise<CodigoQREntity>;
  listarPaginadas(params: {
    instructorId?: string;
    page: number;
    limit: number;
  }): Promise<ListarSesionesPaginadasResult>;
}

