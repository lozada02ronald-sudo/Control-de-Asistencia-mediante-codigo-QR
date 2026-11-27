import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiError,
  apiClient,
  mapApiSessionToClassSession,
  setStoredJwtToken,
} from '../../src/services/apiClient';
import { AttendanceStatus, SessionStatus } from '../../src/types/attendance';
import {
  validateLearnerForm,
  validateQrScanAttempt,
  validateSessionForm,
  validateStaffForm,
} from '../../src/utils/validators';

// Minimal localStorage shim for Node test runtime
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
};

test('validateSessionForm accepts valid session payload and rejects invalid bounds', () => {
  const ok = validateSessionForm({
    cohortCode: 'COH-5120',
    title: 'Control PLC Industrial',
    department: 'Automatización',
    instructor: 'Ing. Sofía Navarro',
    room: 'Lab E-104',
    startTime: '08:00',
    endTime: '12:00',
    geofenceRadius: 50,
    gracePeriodMinutes: 15,
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.errors, {});

  const bad = validateSessionForm({
    cohortCode: 'X',
    title: 'AB',
    department: 'A',
    instructor: 'Yo',
    room: '1',
    startTime: '14:00',
    endTime: '12:00',
    geofenceRadius: 5,
    gracePeriodMinutes: 90,
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.cohortCode);
  assert.ok(bad.errors.title);
  assert.ok(bad.errors.endTime);
  assert.ok(bad.errors.geofenceRadius);
  assert.ok(bad.errors.gracePeriodMinutes);
});

test('validateStaffForm and validateLearnerForm enforce required formats', () => {
  const staffOk = validateStaffForm({
    nombre: 'Ing. Laura Gómez',
    email: 'laura.gomez@politecnico.edu.co',
    password: 'Password123',
  });
  assert.equal(staffOk.valid, true);

  const staffBad = validateStaffForm({
    nombre: 'La',
    email: 'not-an-email',
    password: 'weak',
  });
  assert.equal(staffBad.valid, false);
  assert.ok(staffBad.errors.nombre);
  assert.ok(staffBad.errors.email);
  assert.ok(staffBad.errors.password);

  assert.equal(
    validateLearnerForm({ fullName: 'Alejandro Torres', nationalId: 'CC 1049210334' }).valid,
    true
  );
  assert.equal(validateLearnerForm({ fullName: 'Al', nationalId: '123' }).valid, false);
});

test('validateQrScanAttempt checks session state, token, and geofence', () => {
  assert.equal(
    validateQrScanAttempt({
      token: 'ACADEQR:COH-2841:TK-882194',
      distanceMeters: 20,
      geofenceRadiusMeters: 50,
      isSessionLive: true,
    }).valid,
    true
  );

  const outside = validateQrScanAttempt({
    token: 'ACADEQR:COH-2841:TK-882194',
    distanceMeters: 80,
    geofenceRadiusMeters: 50,
    isSessionLive: true,
  });
  assert.equal(outside.valid, false);
  assert.match(outside.reason || '', /geocerca/i);

  const closed = validateQrScanAttempt({
    token: 'ACADEQR:COH-2841:TK-882194',
    distanceMeters: 10,
    geofenceRadiusMeters: 50,
    isSessionLive: false,
  });
  assert.equal(closed.valid, false);
});

test('apiClient attaches JWT Bearer header, maps session DTOs, and surfaces ApiError', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; auth: string | null }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(input), auth: headers.get('Authorization') });

    if (String(input).endsWith('/api/sesiones')) {
      return new Response(
        JSON.stringify({
          total: 1,
          sesiones: [
            {
              id: 'ses-900',
              instructor_nombre: 'Ing. Mateo Restrepo',
              codigo_cohorte: 'COH-900',
              nombre: 'Robótica Aplicada',
              departamento: 'Mecatrónica',
              sede: 'Sede Norte',
              aula: 'Lab R-101',
              fecha: '2026-11-27',
              hora_inicio: '08:00:00',
              hora_fin: '12:00:00',
              activa: 1,
              geocerca_metros: 40,
              gracia_minutos: 10,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ detail: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    setStoredJwtToken('jwt-test-token-123');
    const res = await apiClient.sessions.list();
    assert.equal(calls[0].auth, 'Bearer jwt-test-token-123');
    assert.equal(res.total, 1);

    const mapped = mapApiSessionToClassSession(res.sesiones[0], [
      {
        id: 'asi-1',
        aprendiz_id: 'lrn-1',
        aprendiz_nombre: 'Valeria Gómez',
        documento: 'CC 1028774129',
        estado: 'PRESENTE',
        metodo: 'Dynamic QR',
        distancia_metros: 12,
        firma_token: 'SIG-123',
        registrado_en: '2026-11-27T08:05:00Z',
      },
    ]);
    assert.equal(mapped.status, SessionStatus.LIVE);
    assert.equal(mapped.geofenceRadiusMeters, 40);
    assert.equal(mapped.records[0].status, AttendanceStatus.PRESENT);

    await assert.rejects(
      () => apiClient.users.list(),
      (err: unknown) => err instanceof ApiError && err.status === 401 && err.detail === 'No autorizado'
    );
  } finally {
    globalThis.fetch = originalFetch;
    setStoredJwtToken(null);
  }
});
