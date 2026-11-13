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
    title: 'Industrial Mechatronics & PLC Control',
    department: 'Mechatronics & Automation',
    instructor: 'Eng. Mateo Restrepo',
    room: 'Workshop B-204',
    campus: 'North Technical Campus',
    startTime: '08:00',
    endTime: '12:00',
    dateLabel: 'Today',
    status: SessionStatus.LIVE,
    geofenceRadiusMeters: 50,
    gracePeriodMinutes: 10,
    learners: [
      { id: 'lrn-01', fullName: 'Camila Mendoza Ruiz', nationalId: 'CC 1.094.882.310', program: 'Mechatronics Tech', avatarColor: '#006948' },
      { id: 'lrn-02', fullName: 'Santiago Vargas Gil', nationalId: 'CC 1.018.490.224', program: 'Mechatronics Tech', avatarColor: '#0051d5' },
      { id: 'lrn-03', fullName: 'Valentina Herrera Castro', nationalId: 'CC 1.032.774.901', program: 'Mechatronics Tech', avatarColor: '#0f172a' },
      { id: 'lrn-04', fullName: 'Andrés Felipe Morales', nationalId: 'CC 1.088.341.552', program: 'Mechatronics Tech', avatarColor: '#8d4b00' },
      { id: 'lrn-05', fullName: 'Lucía Fernanda Díaz', nationalId: 'CC 1.005.619.048', program: 'Mechatronics Tech', avatarColor: '#006948' },
      { id: 'lrn-06', fullName: 'Daniela Ospina Quintero', nationalId: 'CC 1.112.903.117', program: 'Mechatronics Tech', avatarColor: '#0051d5' },
      { id: 'lrn-07', fullName: 'Julián Esteban Rojas', nationalId: 'CC 1.020.844.630', program: 'Mechatronics Tech', avatarColor: '#3d4a42' },
      { id: 'lrn-08', fullName: 'Mariana Gómez Salazar', nationalId: 'CC 1.098.112.405', program: 'Mechatronics Tech', avatarColor: '#006948' },
      { id: 'lrn-09', fullName: 'Sebastián Cano Arias', nationalId: 'CC 1.045.229.883', program: 'Mechatronics Tech', avatarColor: '#8d4b00' },
      { id: 'lrn-10', fullName: 'Sofía Pineda Beltrán', nationalId: 'CC 1.077.510.992', program: 'Mechatronics Tech', avatarColor: '#0051d5' },
    ],
    records: [
      { learnerId: 'lrn-01', status: AttendanceStatus.PRESENT, checkedInAt: '07:56:14', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 18, tokenSignature: 'SIG-9A4F2C' },
      { learnerId: 'lrn-02', status: AttendanceStatus.PRESENT, checkedInAt: '07:58:02', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 24, tokenSignature: 'SIG-9A4F2C' },
      { learnerId: 'lrn-03', status: AttendanceStatus.PRESENT, checkedInAt: '08:01:45', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 12, tokenSignature: 'SIG-3B8E10' },
      { learnerId: 'lrn-04', status: AttendanceStatus.LATE, checkedInAt: '08:14:29', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 31, tokenSignature: 'SIG-7D1C44', note: 'Checked in 14m after start' },
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
    title: 'CNC Precision Milling & Metrology',
    department: 'Mechanical Fabrication',
    instructor: 'Inst. Carolina Suárez',
    room: 'CNC Bay C-102',
    campus: 'North Technical Campus',
    startTime: '08:30',
    endTime: '12:30',
    dateLabel: 'Today',
    status: SessionStatus.LIVE,
    geofenceRadiusMeters: 40,
    gracePeriodMinutes: 10,
    learners: [
      { id: 'lrn-11', fullName: 'Juan Pablo Torres León', nationalId: 'CC 1.036.412.780', program: 'CNC Machining', avatarColor: '#006948' },
      { id: 'lrn-12', fullName: 'Isabella Cardona Mejía', nationalId: 'CC 1.017.882.104', program: 'CNC Machining', avatarColor: '#0051d5' },
      { id: 'lrn-13', fullName: 'Nicolás Ramírez Zapata', nationalId: 'CC 1.053.991.440', program: 'CNC Machining', avatarColor: '#0f172a' },
      { id: 'lrn-14', fullName: 'Gabriela Navarro Peña', nationalId: 'CC 1.082.304.611', program: 'CNC Machining', avatarColor: '#006948' },
      { id: 'lrn-15', fullName: 'Tomás Echeverri Vélez', nationalId: 'CC 1.040.775.209', program: 'CNC Machining', avatarColor: '#8d4b00' },
      { id: 'lrn-16', fullName: 'Laura Juliana Cortés', nationalId: 'CC 1.090.118.932', program: 'CNC Machining', avatarColor: '#0051d5' },
    ],
    records: [
      { learnerId: 'lrn-11', status: AttendanceStatus.PRESENT, checkedInAt: '08:25:10', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 14, tokenSignature: 'SIG-1C8D55' },
      { learnerId: 'lrn-12', status: AttendanceStatus.PRESENT, checkedInAt: '08:27:44', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 19, tokenSignature: 'SIG-1C8D55' },
      { learnerId: 'lrn-13', status: AttendanceStatus.PRESENT, checkedInAt: '08:29:03', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 8, tokenSignature: 'SIG-1C8D55' },
      { learnerId: 'lrn-14', status: AttendanceStatus.PRESENT, checkedInAt: '08:31:20', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 21, tokenSignature: 'SIG-5E0B12' },
      { learnerId: 'lrn-15', status: AttendanceStatus.LATE, checkedInAt: '08:42:18', method: CheckInMethod.DYNAMIC_QR, distanceMeters: 33, tokenSignature: 'SIG-8A9C71', note: 'Grace period exceeded' },
      { learnerId: 'lrn-16', status: AttendanceStatus.PRESENT, checkedInAt: '08:28:55', method: CheckInMethod.INSTRUCTOR_OVERRIDE, distanceMeters: null, tokenSignature: null, note: 'Badge verified at bench' },
    ],
  },
  {
    id: 'ses-4022',
    cohortCode: 'COH-4022',
    title: 'High-Voltage Industrial Installations',
    department: 'Electrical Systems',
    instructor: 'Eng. Ricardo Mendoza',
    room: 'Power Lab A-108',
    campus: 'Central Polytechnic',
    startTime: '14:00',
    endTime: '18:00',
    dateLabel: 'Today',
    status: SessionStatus.SCHEDULED,
    geofenceRadiusMeters: 60,
    gracePeriodMinutes: 15,
    learners: [
      { id: 'lrn-17', fullName: 'Mateo Silva Domínguez', nationalId: 'CC 1.061.554.210', program: 'Electrical Tech', avatarColor: '#0051d5' },
      { id: 'lrn-18', fullName: 'Paula Andrea Rincón', nationalId: 'CC 1.073.208.490', program: 'Electrical Tech', avatarColor: '#006948' },
      { id: 'lrn-19', fullName: 'Cristian David Hoyos', nationalId: 'CC 1.022.619.831', program: 'Electrical Tech', avatarColor: '#0f172a' },
      { id: 'lrn-20', fullName: 'Natalia Franco Oviedo', nationalId: 'CC 1.085.441.720', program: 'Electrical Tech', avatarColor: '#8d4b00' },
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
    title: 'Enterprise Network & Fiber Cabling',
    department: 'Telecommunications',
    instructor: 'Inst. Diana Marcela Pardo',
    room: 'Telecom Lab D-301',
    campus: 'North Technical Campus',
    startTime: '06:00',
    endTime: '08:00',
    dateLabel: 'Today',
    status: SessionStatus.COMPLETED,
    geofenceRadiusMeters: 50,
    gracePeriodMinutes: 10,
    learners: [
      { id: 'lrn-21', fullName: 'Esteban Quiroga Parra', nationalId: 'CC 1.019.334.812', program: 'Telecom Systems', avatarColor: '#006948' },
      { id: 'lrn-22', fullName: 'Sara Lucía Bedoya', nationalId: 'CC 1.096.220.415', program: 'Telecom Systems', avatarColor: '#0051d5' },
      { id: 'lrn-23', fullName: 'Felipe Agudelo Restrepo', nationalId: 'CC 1.037.801.662', program: 'Telecom Systems', avatarColor: '#0f172a' },
      { id: 'lrn-24', fullName: 'Manuela Montoya Vélez', nationalId: 'CC 1.044.918.203', program: 'Telecom Systems', avatarColor: '#006948' },
      { id: 'lrn-25', fullName: 'Brayan Alexander Cruz', nationalId: 'CC 1.071.502.319', program: 'Telecom Systems', avatarColor: '#8d4b00' },
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
    reason: 'Checked in 14 min after session start (10m grace period)',
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
    reason: 'Dynamic QR verified within Workshop B-204 geofence',
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
    reason: 'Manual token code verified within campus boundary',
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

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function downloadAttendanceCsv(session: ClassSession): void {
  const headers = [
    'Cohort Code',
    'Session Title',
    'National ID',
    'Learner Name',
    'Status',
    'Check-In Time',
    'Verification Method',
    'GPS Distance (m)',
    'Token Signature',
  ];

  const rows = session.learners.map((learner) => {
    const rec = session.records.find((r) => r.learnerId === learner.id);
    return [
      session.cohortCode,
      `"${session.title.replace(/"/g, '""')}"`,
      learner.nationalId,
      `"${learner.fullName.replace(/"/g, '""')}"`,
      rec?.status ?? AttendanceStatus.ABSENT,
      rec?.checkedInAt ?? '—',
      rec?.method ?? CheckInMethod.NONE,
      rec?.distanceMeters !== null && rec?.distanceMeters !== undefined ? String(rec.distanceMeters) : '—',
      rec?.tokenSignature ?? '—',
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `attendance_${session.cohortCode.toLowerCase()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
