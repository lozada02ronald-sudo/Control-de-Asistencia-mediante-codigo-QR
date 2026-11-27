import {
  AttendanceRecord,
  AttendanceStatus,
  CheckInMethod,
  ClassSession,
  Learner,
  SessionStatus,
} from '../types/attendance';

export const JWT_STORAGE_KEY = 'acadeqr_jwt_token';

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export function getStoredJwtToken(): string | null {
  try {
    return localStorage.getItem(JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredJwtToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(JWT_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(JWT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (requireAuth) {
    const token = getStoredJwtToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = text ? { detail: text } : null;
  }

  if (!response.ok) {
    const detail =
      (payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as { detail: unknown }).detail)
        : null) || `Error HTTP ${response.status}`;
    throw new ApiError(response.status, detail);
  }

  return payload as T;
}

// ==========================================================
// API DTOs
// ==========================================================
export interface ApiUser {
  id: string;
  nombre: string;
  documento?: string | null;
  email: string;
  rol: 'ADMIN' | 'INSTRUCTOR' | 'APRENDIZ';
  programa?: string | null;
  sede?: string | null;
  activo?: number | boolean;
  creado_en?: string;
}

export interface ApiSessionRow {
  id: string;
  instructor_id?: string | null;
  instructor_nombre?: string | null;
  codigo_cohorte: string;
  nombre: string;
  departamento?: string | null;
  sede: string;
  aula: string;
  fecha?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  activa: number | boolean;
  geocerca_metros: number;
  gracia_minutos: number;
}

export interface ApiAttendanceRow {
  id: string;
  aprendiz_id: string;
  aprendiz_nombre?: string | null;
  documento?: string | null;
  email?: string | null;
  estado: 'PRESENTE' | 'TARDANZA' | 'AUSENTE' | 'EXCUSA';
  metodo?: string | null;
  distancia_metros?: number | null;
  firma_token?: string | null;
  nota?: string | null;
  registrado_en?: string | null;
}

export interface ApiSessionDetailResponse {
  sesion: ApiSessionRow;
  qr_activo: { token: string; expira_en: string; revocado: number } | null;
  total_asistencias: number;
  asistencias: ApiAttendanceRow[];
}

export interface CreateSessionPayload {
  codigo_cohorte: string;
  nombre: string;
  departamento?: string;
  sede: string;
  aula: string;
  fecha?: string;
  hora_inicio: string;
  hora_fin: string;
  geocerca_metros: number;
  gracia_minutos: number;
}

export interface UpdateSessionPayload {
  nombre?: string;
  aula?: string;
  activa?: boolean;
  geocerca_metros?: number;
  gracia_minutos?: number;
}

export interface CreateUserPayload {
  nombre: string;
  documento?: string;
  email: string;
  password: string;
  rol: 'ADMIN' | 'INSTRUCTOR' | 'APRENDIZ';
  programa?: string;
  sede?: string;
}

export interface UpdateUserPayload {
  nombre?: string;
  documento?: string;
  email?: string;
  password?: string;
  rol?: 'ADMIN' | 'INSTRUCTOR' | 'APRENDIZ';
  programa?: string;
  sede?: string;
  activo?: boolean;
}

// ==========================================================
// Mappers
// ==========================================================
const AVATAR_COLORS = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

function mapApiEstadoToStatus(estado: string): AttendanceStatus {
  switch (estado.toUpperCase()) {
    case 'PRESENTE':
      return AttendanceStatus.PRESENT;
    case 'TARDANZA':
      return AttendanceStatus.LATE;
    default:
      return AttendanceStatus.ABSENT;
  }
}

export function mapStatusToApiEstado(
  status: AttendanceStatus
): 'PRESENTE' | 'TARDANZA' | 'AUSENTE' {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return 'PRESENTE';
    case AttendanceStatus.LATE:
      return 'TARDANZA';
    default:
      return 'AUSENTE';
  }
}

function mapApiMethod(metodo?: string | null): CheckInMethod {
  if (!metodo) return CheckInMethod.NONE;
  if (metodo.toLowerCase().includes('manual')) return CheckInMethod.MANUAL_TOKEN;
  if (metodo.toLowerCase().includes('override') || metodo.toLowerCase().includes('instructor')) {
    return CheckInMethod.INSTRUCTOR_OVERRIDE;
  }
  return CheckInMethod.DYNAMIC_QR;
}

export function mapApiSessionToClassSession(
  row: ApiSessionRow,
  asistencias: ApiAttendanceRow[] = []
): ClassSession {
  const learners: Learner[] = asistencias.map((a, idx) => ({
    id: a.aprendiz_id,
    fullName: a.aprendiz_nombre || `Aprendiz ${a.aprendiz_id}`,
    nationalId: a.documento || '—',
    program: row.departamento || 'Formación Técnica',
    avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
  }));

  const records: AttendanceRecord[] = asistencias.map((a) => {
    const dt = a.registrado_en ? new Date(a.registrado_en) : null;
    const validDt = dt && !Number.isNaN(dt.getTime()) ? dt : null;
    return {
      learnerId: a.aprendiz_id,
      status: mapApiEstadoToStatus(a.estado),
      checkedInAt: validDt
        ? validDt.toTimeString().slice(0, 8)
        : null,
      checkedInDate: validDt ? validDt.toLocaleDateString('es-CO') : null,
      method: mapApiMethod(a.metodo),
      distanceMeters: a.distancia_metros ?? null,
      tokenSignature: a.firma_token ?? null,
      note: a.nota ?? undefined,
    };
  });

  const formatTime = (t?: string | null, fallback = '08:00') =>
    t ? String(t).slice(0, 5) : fallback;

  return {
    id: row.id,
    cohortCode: row.codigo_cohorte,
    title: row.nombre,
    department: row.departamento || 'Formación Académica',
    instructor: row.instructor_nombre || 'Instructor Asignado',
    room: row.aula,
    campus: row.sede,
    startTime: formatTime(row.hora_inicio, '08:00'),
    endTime: formatTime(row.hora_fin, '12:00'),
    dateLabel: row.fecha ? String(row.fecha).slice(0, 10) : 'Hoy',
    status: row.activa ? SessionStatus.LIVE : SessionStatus.COMPLETED,
    geofenceRadiusMeters: Number(row.geocerca_metros) || 50,
    gracePeriodMinutes: Number(row.gracia_minutos) ?? 15,
    learners,
    records,
  };
}

// ==========================================================
// API Client Endpoints
// ==========================================================
export const apiClient = {
  health: () =>
    requestJson<{
      status: string;
      database: { status: string; tables: Record<string, number> };
    }>('/api/health', { method: 'GET' }, false),

  auth: {
    me: () => requestJson<{ usuario: ApiUser }>('/api/auth/me', { method: 'GET' }, true),
    login: (email: string, password: string) =>
      requestJson<{ access_token: string; usuario: ApiUser }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
        false
      ),
    register: (payload: CreateUserPayload) =>
      requestJson<{ access_token: string; usuario: ApiUser }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        false
      ),
  },

  sessions: {
    list: (params?: { activa?: boolean; cohorte?: string }) => {
      const qs = new URLSearchParams();
      if (params?.activa !== undefined) qs.set('activa', String(params.activa));
      if (params?.cohorte) qs.set('cohorte', params.cohorte);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return requestJson<{ total: number; sesiones: ApiSessionRow[] }>(
        `/api/sesiones${query}`,
        { method: 'GET' },
        true
      );
    },
    detail: (sesionId: string) =>
      requestJson<ApiSessionDetailResponse>(
        `/api/sesiones/${encodeURIComponent(sesionId)}`,
        { method: 'GET' },
        true
      ),
    create: (payload: CreateSessionPayload) =>
      requestJson<{ mensaje: string; sesion_id: string; token_inicial: string }>(
        '/api/sesiones',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        true
      ),
    update: (sesionId: string, payload: UpdateSessionPayload) =>
      requestJson<{ mensaje: string }>(
        `/api/sesiones/${encodeURIComponent(sesionId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        true
      ),
    close: (sesionId: string) =>
      requestJson<{ mensaje: string }>(
        `/api/sesiones/${encodeURIComponent(sesionId)}`,
        { method: 'DELETE' },
        true
      ),
  },

  qr: {
    rotate: (sesionId: string, segundosValidez = 30) =>
      requestJson<{ token: string; expira_en: string; sesion_id: string }>(
        '/api/qr/rotate',
        {
          method: 'POST',
          body: JSON.stringify({
            sesion_id: sesionId,
            segundos_validez: Math.max(10, Math.min(300, segundosValidez)),
          }),
        },
        true
      ),
    active: (sesionId: string) =>
      requestJson<{ qr: { token: string; expira_en: string; revocado: number } | null }>(
        `/api/qr/active/${encodeURIComponent(sesionId)}`,
        { method: 'GET' },
        false
      ),
  },

  attendance: {
    scan: (payload: {
      sesion_id: string;
      token_qr: string;
      distancia_metros: number;
      aprendiz_id?: string;
    }) =>
      requestJson<{
        mensaje: string;
        estado: string;
        firma_token: string;
      }>(
        '/api/asistencias/scan',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        true
      ),
    update: (
      asistenciaId: string,
      payload: { estado: 'PRESENTE' | 'TARDANZA' | 'AUSENTE' | 'EXCUSA'; nota?: string }
    ) =>
      requestJson<{ mensaje: string }>(
        `/api/asistencias/${encodeURIComponent(asistenciaId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        true
      ),
    summary: (sesionId: string) =>
      requestJson<{
        metricas: {
          total: number;
          presentes: number;
          tardanzas: number;
          ausentes: number;
          excusas: number;
          porcentaje_asistencia: number;
        };
      }>(`/api/asistencias/resumen/${encodeURIComponent(sesionId)}`, { method: 'GET' }, true),
  },

  users: {
    list: (params?: { rol?: string; q?: string }) => {
      const qs = new URLSearchParams();
      if (params?.rol) qs.set('rol', params.rol);
      if (params?.q) qs.set('q', params.q);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return requestJson<{ total: number; usuarios: ApiUser[] }>(
        `/api/usuarios${query}`,
        { method: 'GET' },
        true
      );
    },
    create: (payload: CreateUserPayload) =>
      requestJson<{ access_token?: string; usuario: ApiUser }>(
        '/api/usuarios',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        true
      ),
    update: (userId: string, payload: UpdateUserPayload) =>
      requestJson<{ mensaje: string }>(
        `/api/usuarios/${encodeURIComponent(userId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        true
      ),
    deactivate: (userId: string) =>
      requestJson<{ mensaje: string }>(
        `/api/usuarios/${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
        true
      ),
  },
};
