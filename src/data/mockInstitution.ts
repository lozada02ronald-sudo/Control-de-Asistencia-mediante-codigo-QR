import {
  AttendanceStatus,
  CheckInMethod,
  ClassSession,
  ScanEventLog,
  SessionStatus,
} from '../types/attendance';

export const INITIAL_SESSIONS: ClassSession[] = [
  {
    id: 'ses-2841',
    cohortCode: 'COH-2841',
    title: 'Mecatrónica Industrial y Control PLC',
    department: 'Mecatrónica y Automatización',
    instructor: 'Ing. Mateo Restrepo',
    room: 'Taller B-204',
    campus: 'Sede Técnica Norte',
    startTime: '08:00',
    endTime: '12:00',
    dateLabel: 'Hoy',
    status: SessionStatus.LIVE,
    geofenceRadiusMeters: 50,
    gracePeriodMinutes: 10,
    learners: [
      { id: 'lrn-01', fullName: 'Camila Mendoza Ruiz', nationalId: 'CC 1.094.882.310', program: 'Tecnología en Mecatrónica', avatarColor: '#006948' },
      { id: 'lrn-02', fullName: 'Santiago Vargas Gil', nationalId: 'CC 1.018.490.224', program: 'Tecnología en Mecatrónica', avatarColor: '#0051d5' },
      { id: 'lrn-03', fullName: 'Valentina Herrera Castro', nationalId: 'CC 1.032.774.901', program: 'Tecnología en Mecatrónica', avatarColor: '#0f172a' },
      { id: 'lrn-04', fullName: 'Andrés Felipe Morales', nationalId: 'CC 1.088.341.552', program: 'Tecnología en Mecatrónica', avatarColor: '#8d4b00' },
      { id: 'lrn-05', fullName: 'Lucía Fernanda Díaz', nationalId: 'CC 1.005.619.048', program: 'Tecnología en Mecatrónica', avatarColor: '#006948' },
      { id: 'lrn-06', fullName: 'Daniela Ospina Quintero', nationalId: 'CC 1.112.903.117', program: 'Tecnología en Mecatrónica', avatarColor: '#0051d5' },
      { id: 'lrn-07', fullName: 'Julián Esteban Rojas', nationalId: 'CC 1.020.844.630', program: 'Tecnología en Mecatrónica', avatarColor: '#3d4a42' },
      { id: 'lrn-08', fullName: 'Mariana Gómez Salazar', nationalId: 'CC 1.098.112.405', program: 'Tecnología en Mecatrónica', avatarColor: '#006948' },
      { id: 'lrn-09', fullName: 'Sebastián Cano Arias', nationalId: 'CC 1.045.229.883', program: 'Tecnología en Mecatrónica', avatarColor: '#8d4b00' },
      { id: 'lrn-10', fullName: 'Sofía Pineda Beltrán', nationalId: 'CC 1.077.510.992', program: 'Tecnología en Mecatrónica', avatarColor: '#0051d5' },
    ],
    records: [
      { learnerId: 'lrn-01', status: AttendanceStatus.PRESENT, checkedInAt: '07:56:14', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 18, tokenSignature: 'SIG-9A4F2C' },
      { learnerId: 'lrn-02', status: AttendanceStatus.PRESENT, checkedInAt: '07:58:02', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 24, tokenSignature: 'SIG-9A4F2C' },
      { learnerId: 'lrn-03', status: AttendanceStatus.PRESENT, checkedInAt: '08:01:45', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 12, tokenSignature: 'SIG-3B8E10' },
      { learnerId: 'lrn-04', status: AttendanceStatus.LATE, checkedInAt: '08:14:29', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 31, tokenSignature: 'SIG-7D1C44', note: 'Registro 14 min después del inicio' },
      { learnerId: 'lrn-05', status: AttendanceStatus.PRESENT, checkedInAt: '07:54:51', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 9, tokenSignature: 'SIG-4E2A9B' },
      { learnerId: 'lrn-06', status: AttendanceStatus.PRESENT, checkedInAt: '08:03:12', method: CheckInMethod.MANUAL_TOKEN, distanceMeters: 27, tokenSignature: 'SIG-3B8E10' },
      { learnerId: 'lrn-07', status: AttendanceStatus.ABSENT, checkedInAt: null, method: CheckInMethod.NONE, distanceMeters: null, tokenSignature: null },
      { learnerId: 'lrn-08', status: AttendanceStatus.PRESENT, checkedInAt: '07:59:38', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 15, tokenSignature: 'SIG-9A4F2C' },
      { learnerId: 'lrn-09', status: AttendanceStatus.PRESENT, checkedInAt: '08:04:05', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 22, tokenSignature: 'SIG-3B8E10' },
      { learnerId: 'lrn-10', status: AttendanceStatus.ABSENT, checkedInAt: null, method: CheckInMethod.NONE, distanceMeters: null, tokenSignature: null },
    ],
  },
  {
    id: 'ses-3109',
    cohortCode: 'COH-3109',
    title: 'Fresado de Precisión CNC y Metrología',
    department: 'Fabricación Mecánica',
    instructor: 'Inst. Carolina Suárez',
    room: 'Bahía CNC C-102',
    campus: 'Sede Técnica Norte',
    startTime: '08:30',
    endTime: '12:30',
    dateLabel: 'Hoy',
    status: SessionStatus.LIVE,
    geofenceRadiusMeters: 40,
    gracePeriodMinutes: 10,
    learners: [
      { id: 'lrn-11', fullName: 'Juan Pablo Torres León', nationalId: 'CC 1.036.412.780', program: 'Mecanizado CNC', avatarColor: '#006948' },
      { id: 'lrn-12', fullName: 'Isabella Cardona Mejía', nationalId: 'CC 1.017.882.104', program: 'Mecanizado CNC', avatarColor: '#0051d5' },
      { id: 'lrn-13', fullName: 'Nicolás Ramírez Zapata', nationalId: 'CC 1.053.991.440', program: 'Mecanizado CNC', avatarColor: '#0f172a' },
      { id: 'lrn-14', fullName: 'Gabriela Navarro Peña', nationalId: 'CC 1.082.304.611', program: 'Mecanizado CNC', avatarColor: '#006948' },
      { id: 'lrn-15', fullName: 'Tomás Echeverri Vélez', nationalId: 'CC 1.040.775.209', program: 'Mecanizado CNC', avatarColor: '#8d4b00' },
      { id: 'lrn-16', fullName: 'Laura Juliana Cortés', nationalId: 'CC 1.090.118.932', program: 'Mecanizado CNC', avatarColor: '#0051d5' },
    ],
    records: [
      { learnerId: 'lrn-11', status: AttendanceStatus.PRESENT, checkedInAt: '08:25:10', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 14, tokenSignature: 'SIG-1C8D55' },
      { learnerId: 'lrn-12', status: AttendanceStatus.PRESENT, checkedInAt: '08:27:44', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 19, tokenSignature: 'SIG-1C8D55' },
      { learnerId: 'lrn-13', status: AttendanceStatus.PRESENT, checkedInAt: '08:29:03', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 8, tokenSignature: 'SIG-1C8D55' },
      { learnerId: 'lrn-14', status: AttendanceStatus.PRESENT, checkedInAt: '08:31:20', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 21, tokenSignature: 'SIG-5E0B12' },
      { learnerId: 'lrn-15', status: AttendanceStatus.LATE, checkedInAt: '08:42:18', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 33, tokenSignature: 'SIG-8A9C71', note: 'Margen de gracia superado' },
      { learnerId: 'lrn-16', status: AttendanceStatus.PRESENT, checkedInAt: '08:28:55', method: CheckInMethod.INSTRUCTOR_OVERRIDE, distanceMeters: null, tokenSignature: null, note: 'Carnet verificado en banco' },
    ],
  },
  {
    id: 'ses-4022',
    cohortCode: 'COH-4022',
    title: 'Instalaciones Industriales de Alta Tensión',
    department: 'Sistemas Eléctricos',
    instructor: 'Ing. Ricardo Mendoza',
    room: 'Laboratorio de Potencia A-108',
    campus: 'Politécnico Central',
    startTime: '14:00',
    endTime: '18:00',
    dateLabel: 'Hoy',
    status: SessionStatus.SCHEDULED,
    geofenceRadiusMeters: 60,
    gracePeriodMinutes: 15,
    learners: [
      { id: 'lrn-17', fullName: 'Mateo Silva Domínguez', nationalId: 'CC 1.061.554.210', program: 'Tecnología Eléctrica', avatarColor: '#0051d5' },
      { id: 'lrn-18', fullName: 'Paula Andrea Rincón', nationalId: 'CC 1.073.208.490', program: 'Tecnología Eléctrica', avatarColor: '#006948' },
      { id: 'lrn-19', fullName: 'Cristian David Hoyos', nationalId: 'CC 1.022.619.831', program: 'Tecnología Eléctrica', avatarColor: '#0f172a' },
      { id: 'lrn-20', fullName: 'Natalia Franco Oviedo', nationalId: 'CC 1.085.441.720', program: 'Tecnología Eléctrica', avatarColor: '#8d4b00' },
    ],
    records: [
      { learnerId: 'lrn-17', status: AttendanceStatus.ABSENT, checkedInAt: null, method: CheckInMethod.NONE, distanceMeters: null, tokenSignature: null },
      { learnerId: 'lrn-18', status: AttendanceStatus.ABSENT, checkedInAt: null, method: CheckInMethod.NONE, distanceMeters: null, tokenSignature: null },
      { learnerId: 'lrn-19', status: AttendanceStatus.ABSENT, checkedInAt: null, method: CheckInMethod.NONE, distanceMeters: null, tokenSignature: null },
      { learnerId: 'lrn-20', status: AttendanceStatus.ABSENT, checkedInAt: null, method: CheckInMethod.NONE, distanceMeters: null, tokenSignature: null },
    ],
  },
  {
    id: 'ses-1985',
    cohortCode: 'COH-1985',
    title: 'Redes Empresariales y Cableado de Fibra',
    department: 'Telecomunicaciones',
    instructor: 'Inst. Diana Marcela Pardo',
    room: 'Laboratorio Telecom D-301',
    campus: 'Sede Técnica Norte',
    startTime: '06:00',
    endTime: '08:00',
    dateLabel: 'Hoy',
    status: SessionStatus.COMPLETED,
    geofenceRadiusMeters: 50,
    gracePeriodMinutes: 10,
    learners: [
      { id: 'lrn-21', fullName: 'Esteban Quiroga Parra', nationalId: 'CC 1.019.334.812', program: 'Sistemas Telecom', avatarColor: '#006948' },
      { id: 'lrn-22', fullName: 'Sara Lucía Bedoya', nationalId: 'CC 1.096.220.415', program: 'Sistemas Telecom', avatarColor: '#0051d5' },
      { id: 'lrn-23', fullName: 'Felipe Agudelo Restrepo', nationalId: 'CC 1.037.801.662', program: 'Sistemas Telecom', avatarColor: '#0f172a' },
      { id: 'lrn-24', fullName: 'Manuela Montoya Vélez', nationalId: 'CC 1.044.918.203', program: 'Sistemas Telecom', avatarColor: '#006948' },
      { id: 'lrn-25', fullName: 'Brayan Alexander Cruz', nationalId: 'CC 1.071.502.319', program: 'Sistemas Telecom', avatarColor: '#8d4b00' },
    ],
    records: [
      { learnerId: 'lrn-21', status: AttendanceStatus.PRESENT, checkedInAt: '05:57:12', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 16, tokenSignature: 'SIG-0F4A88' },
      { learnerId: 'lrn-22', status: AttendanceStatus.PRESENT, checkedInAt: '05:59:41', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 11, tokenSignature: 'SIG-0F4A88' },
      { learnerId: 'lrn-23', status: AttendanceStatus.PRESENT, checkedInAt: '06:02:09', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 25, tokenSignature: 'SIG-6B1E39' },
      { learnerId: 'lrn-24', status: AttendanceStatus.PRESENT, checkedInAt: '06:00:18', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 19, tokenSignature: 'SIG-0F4A88' },
      { learnerId: 'lrn-25', status: AttendanceStatus.PRESENT, checkedInAt: '06:04:50', method: CheckInMethod.MANUAL_TOKEN, distanceMeters: 29, tokenSignature: 'SIG-6B1E39' },
    ],
  },
];

export const INITIAL_SCAN_LOGS: ScanEventLog[] = [
  {
    id: 'log-1',
    sessionId: 'ses-2841',
    learnerName: 'Andrés Felipe Morales',
    nationalId: 'CC 1.088.341.552',
    outcome: 'LATE',
    reason: 'Registrado 14 min después del inicio (margen de 10 min)',
    timestamp: '08:14:29',
    distanceMeters: 31,
    tokenUsed: 'ACQR-2841-7D1C44',
  },
  {
    id: 'log-2',
    sessionId: 'ses-2841',
    learnerName: 'Sebastián Cano Arias',
    nationalId: 'CC 1.045.229.883',
    outcome: 'VERIFIED',
    reason: 'QR dinámico verificado dentro de la geocerca de Taller B-204',
    timestamp: '08:04:05',
    distanceMeters: 22,
    tokenUsed: 'ACQR-2841-3B8E10',
  },
  {
    id: 'log-3',
    sessionId: 'ses-2841',
    learnerName: 'Daniela Ospina Quintero',
    nationalId: 'CC 1.112.903.117',
    outcome: 'VERIFIED',
    reason: 'Código manual de token verificado dentro de la sede',
    timestamp: '08:03:12',
    distanceMeters: 27,
    tokenUsed: 'ACQR-2841-3B8E10',
  },
];

export function generateRotatingToken(cohortCode: string, sequence: number): string {
  const num = cohortCode.replace(/[^0-9A-Z]/g, '').slice(-4) || '2841';
  const seed = (sequence * 7919 + 104729) % 16777215;
  const hex = seed.toString(16).toUpperCase().padStart(6, '0');
  return `ACQR-${num}-${hex}`;
}

export function formatTimeNow(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

export function formatDateNow(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Genera y descarga un archivo CSV estructurado con codificación UTF-8 y BOM
 * para compatibilidad total con Microsoft Excel y hojas de cálculo en español.
 */
export function downloadAttendanceCsv(session: ClassSession): void {
  const headers = [
    'Código Cohorte',
    'Título de Asignatura',
    'Documento Identidad',
    'Nombre del Aprendiz',
    'Estado Asistencia',
    'Hora de Registro',
    'Método Verificación',
    'Distancia GPS (m)',
    'Firma Criptográfica',
  ];

  const rows = session.learners.map((learner) => {
    const rec = session.records.find((r) => r.learnerId === learner.id);
    const statusLabel =
      rec?.status === AttendanceStatus.PRESENT
        ? 'PRESENTE'
        : rec?.status === AttendanceStatus.LATE
        ? 'TARDANZA'
        : 'AUSENTE';

    return [
      session.cohortCode,
      `"${session.title.replace(/"/g, '""')}"`,
      learner.nationalId,
      `"${learner.fullName.replace(/"/g, '""')}"`,
      statusLabel,
      rec?.checkedInAt ?? '—',
      rec?.method ?? CheckInMethod.NONE,
      rec?.distanceMeters !== null && rec?.distanceMeters !== undefined ? String(rec.distanceMeters) : '—',
      rec?.tokenSignature ?? '—',
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) para visualización correcta de tildes y caracteres latinos en Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `asistencia_${session.cohortCode.toLowerCase()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Emite un tono de confirmación auditivo sintetizado mediante Web Audio API
 * sin dependencias externas y con vibración háptica en dispositivos móviles.
 */
export function playFeedbackTone(success: boolean = true): void {
  if (typeof window === 'undefined') return;

  // Haptic feedback
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(success ? [40, 25, 50] : [120, 60, 120]);
    }
  } catch {
    // Vibration blocked or unsupported
  }

  // Audio synthesis
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Audio context prevented by policy
  }
}
