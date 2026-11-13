export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
}

export enum SessionStatus {
  LIVE = 'LIVE',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
}

export enum CheckInMethod {
  DYNAMIC_QR = 'Dynamic QR',
  MANUAL_TOKEN = 'Manual Token',
  INSTRUCTOR_OVERRIDE = 'Instructor Override',
  NONE = 'Not Checked In',
}

export interface Learner {
  id: string;
  fullName: string;
  nationalId: string;
  program: string;
  avatarColor: string;
}

export interface AttendanceRecord {
  learnerId: string;
  status: AttendanceStatus;
  checkedInAt: string | null;
  method: CheckInMethod;
  distanceMeters: number | null;
  tokenSignature: string | null;
  note?: string;
}

export interface ClassSession {
  id: string;
  cohortCode: string;
  title: string;
  department: string;
  instructor: string;
  room: string;
  campus: string;
  startTime: string;
  endTime: string;
  dateLabel: string;
  status: SessionStatus;
  geofenceRadiusMeters: number;
  gracePeriodMinutes: number;
  learners: Learner[];
  records: AttendanceRecord[];
}

export interface ScanEventLog {
  id: string;
  sessionId: string;
  learnerName: string;
  nationalId: string;
  outcome: 'VERIFIED' | 'LATE' | 'DENIED';
  reason: string;
  timestamp: string;
  distanceMeters: number;
  tokenUsed: string;
}

export interface VerificationResult {
  outcome: 'VERIFIED' | 'LATE' | 'DENIED';
  title: string;
  detail: string;
  timestamp: string;
  sessionTitle?: string;
  learnerName?: string;
  nationalId?: string;
  distanceMeters?: number;
  signature?: string;
}

export type AppScreen = 'overview' | 'projector' | 'scanner' | 'roster';
