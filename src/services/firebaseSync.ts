import type { ClassSession, ScanEventLog } from '../types/attendance';

export interface FirebaseConfigState {
  databaseUrl: string;
  projectId: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

const FIREBASE_CONFIG_KEY = 'acadeqr_firebase_config_v1';

export function loadFirebaseConfig(): FirebaseConfigState {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (raw) return JSON.parse(raw) as FirebaseConfigState;
  } catch {
    // ignore
  }
  return {
    databaseUrl: '',
    projectId: 'acadeqr-asistencia-android',
    autoSync: true,
    lastSyncedAt: null,
  };
}

export function saveFirebaseConfig(config: FirebaseConfigState): void {
  try {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

function normalizeDbUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export async function syncToFirebase(
  config: FirebaseConfigState,
  payload: { sessions: ClassSession[]; scanLogs: ScanEventLog[] }
): Promise<{ ok: boolean; mode: 'firebase' | 'local'; message: string; syncedAt: string }> {
  const syncedAt = new Date().toLocaleTimeString('es-ES', { hour12: false });
  const cleanUrl = normalizeDbUrl(config.databaseUrl);

  if (!cleanUrl) {
    return {
      ok: true,
      mode: 'local',
      syncedAt,
      message: 'Sincronizado en modo almacenamiento local (configura una URL de Firebase Realtime DB para nube).',
    };
  }

  try {
    const res = await fetch(`${cleanUrl}/acadeqr.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: new Date().toISOString(),
        projectId: config.projectId,
        groupsCount: payload.sessions.length,
        sessions: payload.sessions,
        scanLogs: payload.scanLogs.slice(0, 50),
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        mode: 'firebase',
        syncedAt,
        message: `Firebase respondió HTTP ${res.status}. Verifica las reglas de acceso o la URL.`,
      };
    }

    return {
      ok: true,
      mode: 'firebase',
      syncedAt,
      message: `Sincronización exitosa con Firebase (${payload.sessions.length} grupos/sesiones).`,
    };
  } catch {
    return {
      ok: false,
      mode: 'firebase',
      syncedAt,
      message: 'No se pudo conectar con la URL de Firebase. Revisa tu red o la URL ingresada.',
    };
  }
}
