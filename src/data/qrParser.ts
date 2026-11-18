export interface ParsedQrData {
  sessionId?: string;
  cohort?: string;
  token: string;
  room?: string;
  isValid: boolean;
  raw: string;
}

/**
 * Parsea e interpreta de forma segura la carga útil de cualquier código QR escaneado.
 * Admite:
 * 1. URLs de registro directo (ej. https://dominio/?session=ses-2841&token=ACQR-2841-A5C9B2)
 * 2. Cargas JSON criptográficas (ej. {"v":1,"sessionId":"ses-2841","token":"ACQR-..."})
 * 3. Tokens rotativos puros en texto plano (ej. ACQR-2841-A5C9B2)
 */
export function parseQrData(rawInput: string): ParsedQrData {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return { token: '', isValid: false, raw: rawInput };
  }

  // 1. Detección de objeto JSON institucional
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && parsed.token) {
        return {
          sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
          cohort: typeof parsed.cohort === 'string' ? parsed.cohort : undefined,
          token: String(parsed.token).trim().toUpperCase(),
          room: typeof parsed.room === 'string' ? parsed.room : undefined,
          isValid: true,
          raw: trimmed,
        };
      }
    } catch {
      // No era JSON válido, continuar con otros formatos
    }
  }

  // 2. Detección de URL con parámetros de sesión y token
  if (trimmed.includes('token=') || trimmed.includes('session=')) {
    try {
      const dummyBase = 'https://acadeqr.institution.edu';
      const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(trimmed, dummyBase);

      const token = url.searchParams.get('token') || '';
      const sessionId = url.searchParams.get('session') || undefined;
      const cohort = url.searchParams.get('cohort') || undefined;
      const room = url.searchParams.get('room') || undefined;

      if (token) {
        return {
          token: token.trim().toUpperCase(),
          sessionId,
          cohort,
          room,
          isValid: true,
          raw: trimmed,
        };
      }
    } catch {
      // Continuar con token directo
    }
  }

  // 3. Token directo en texto plano (ej. ACQR-2841-3B8E10)
  const isAcadeToken = /^ACQR-[0-9A-Z]{3,6}-[0-9A-F]{4,8}$/i.test(trimmed);

  return {
    token: trimmed.toUpperCase(),
    isValid: isAcadeToken || trimmed.length >= 6,
    raw: trimmed,
  };
}

