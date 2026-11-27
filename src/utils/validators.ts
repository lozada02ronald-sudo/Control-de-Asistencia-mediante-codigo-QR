export interface ValidationResult<T extends string = string> {
  valid: boolean;
  errors: Partial<Record<T, string>>;
}

export type SessionField =
  | 'cohortCode'
  | 'title'
  | 'department'
  | 'instructor'
  | 'room'
  | 'startTime'
  | 'endTime'
  | 'geofenceRadius'
  | 'gracePeriodMinutes';

export interface SessionFormInput {
  cohortCode: string;
  title: string;
  department: string;
  instructor: string;
  room: string;
  startTime: string;
  endTime: string;
  geofenceRadius: number;
  gracePeriodMinutes: number;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const COHORT_REGEX = /^[A-Za-z0-9][A-Za-z0-9-_]{2,39}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function parseTimeMinutes(hhmm: string): number | null {
  const match = TIME_REGEX.exec(hhmm.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function validateSessionForm(input: SessionFormInput): ValidationResult<SessionField> {
  const errors: Partial<Record<SessionField, string>> = {};

  const cohort = input.cohortCode.trim();
  if (!COHORT_REGEX.test(cohort)) {
    errors.cohortCode =
      'Ingresa un código de cohorte válido (3-40 caracteres alfanuméricos o guiones, ej. COH-5120).';
  }

  if (input.title.trim().length < 3) {
    errors.title = 'El nombre de la sesión debe tener al menos 3 caracteres.';
  }

  if (input.department.trim().length < 2) {
    errors.department = 'Especifica el departamento o programa académico.';
  }

  if (input.instructor.trim().length < 3) {
    errors.instructor = 'Ingresa el nombre completo del instructor (mínimo 3 caracteres).';
  }

  if (input.room.trim().length < 2) {
    errors.room = 'Indica el aula o taller asignado (mínimo 2 caracteres).';
  }

  const startMin = parseTimeMinutes(input.startTime);
  const endMin = parseTimeMinutes(input.endTime);
  if (startMin === null) {
    errors.startTime = 'Formato de hora inválido (usa HH:MM).';
  }
  if (endMin === null) {
    errors.endTime = 'Formato de hora inválido (usa HH:MM).';
  }
  if (startMin !== null && endMin !== null && endMin <= startMin) {
    errors.endTime = 'La hora de fin debe ser posterior a la hora de inicio.';
  }

  if (!Number.isFinite(input.geofenceRadius) || input.geofenceRadius < 10 || input.geofenceRadius > 500) {
    errors.geofenceRadius = 'El radio de geocerca debe estar entre 10 y 500 metros.';
  }

  if (
    !Number.isFinite(input.gracePeriodMinutes) ||
    input.gracePeriodMinutes < 0 ||
    input.gracePeriodMinutes > 60
  ) {
    errors.gracePeriodMinutes = 'El margen de gracia debe estar entre 0 y 60 minutos.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export type StaffField = 'nombre' | 'email' | 'documento' | 'password';

export interface StaffFormInput {
  nombre: string;
  email: string;
  documento?: string;
  password: string;
}

export function validateStaffForm(input: StaffFormInput): ValidationResult<StaffField> {
  const errors: Partial<Record<StaffField, string>> = {};

  if (input.nombre.trim().length < 3) {
    errors.nombre = 'El nombre completo debe tener al menos 3 caracteres.';
  }

  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido (ej. usuario@institucion.edu.co).';
  }

  if (input.documento && input.documento.trim().length > 0 && input.documento.trim().length < 5) {
    errors.documento = 'El número de documento debe tener al menos 5 caracteres.';
  }

  if (input.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(input.password)) {
    errors.password = 'Debe incluir mayúscula, minúscula y al menos un número.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export type LearnerField = 'fullName' | 'nationalId';

export function validateLearnerForm(input: {
  fullName: string;
  nationalId: string;
}): ValidationResult<LearnerField> {
  const errors: Partial<Record<LearnerField, string>> = {};

  if (input.fullName.trim().length < 3) {
    errors.fullName = 'El nombre del aprendiz debe tener al menos 3 caracteres.';
  }

  if (input.nationalId.trim().length < 5) {
    errors.nationalId = 'El documento debe tener al menos 5 caracteres (ej. CC 1.045.221.900).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateQrScanAttempt(input: {
  token: string;
  distanceMeters: number;
  geofenceRadiusMeters: number;
  isSessionLive: boolean;
}): { valid: boolean; reason?: string } {
  if (!input.isSessionLive) {
    return { valid: false, reason: 'La sesión de clase está cerrada o inactiva.' };
  }
  const cleanToken = input.token.trim();
  if (cleanToken.length < 6) {
    return { valid: false, reason: 'El token QR ingresado es inválido o está vacío.' };
  }
  if (!Number.isFinite(input.distanceMeters) || input.distanceMeters < 0) {
    return { valid: false, reason: 'La distancia GPS reportada no es válida.' };
  }
  if (input.distanceMeters > input.geofenceRadiusMeters) {
    return {
      valid: false,
      reason: `Fuera de geocerca (${input.distanceMeters} m > ${input.geofenceRadiusMeters} m permitidos).`,
    };
  }
  return { valid: true };
}
