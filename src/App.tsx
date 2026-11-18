import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdminSystemConfig,
  AppScreen,
  AttendanceStatus,
  CheckInMethod,
  ClassSession,
  Learner,
  ScanEventLog,
  SessionStatus,
  VerificationResult,
} from './types/attendance';
import {
  INITIAL_SCAN_LOGS,
  INITIAL_SESSIONS,
  downloadAttendanceCsv,
  formatDateNow,
  formatTimeNow,
  generateRotatingToken,
  playFeedbackTone,
} from './data/mockInstitution';
import { LandingPage } from './components/LandingPage';
import { PageSkeleton } from './components/PageSkeleton';
import { ThreeBackground } from './components/ThreeBackground';
import { AuthPortalScreen, AuthUserSession } from './components/AuthPortalScreen';
import { Building2, Download, LogOut, Menu, QrCode, X } from 'lucide-react';

const OverviewScreen = lazy(() =>
  import('./components/OverviewScreen').then((m) => ({ default: m.OverviewScreen })),
);
const QrProjectorScreen = lazy(() =>
  import('./components/QrProjectorScreen').then((m) => ({ default: m.QrProjectorScreen })),
);
const ScannerScreen = lazy(() =>
  import('./components/ScannerScreen').then((m) => ({ default: m.ScannerScreen })),
);
const RosterScreen = lazy(() =>
  import('./components/RosterScreen').then((m) => ({ default: m.RosterScreen })),
);
const AdminScreen = lazy(() =>
  import('./components/AdminScreen').then((m) => ({ default: m.AdminScreen })),
);
const LearnerAttendanceScreen = lazy(() =>
  import('./components/LearnerAttendanceScreen').then((m) => ({
    default: m.LearnerAttendanceScreen,
  })),
);

const STORAGE_KEY = 'acadeqr_sessions_v3';
const SCAN_LOGS_STORAGE_KEY = 'acadeqr_scan_logs_v1';
const ADMIN_CONFIG_STORAGE_KEY = 'acadeqr_admin_config_v1';
const PUBLIC_AUTH_KEY = 'acadeqr_public_auth_v1';
const ADMIN_AUTH_KEY = 'acadeqr_admin_auth_v1';

const DEFAULT_ADMIN_CONFIG: AdminSystemConfig = {
  institutionName: 'POLITÉCNICO NACIONAL DE FORMACIÓN TÉCNICA',
  cryptoAlgorithm: 'HMAC-SHA256 (FIPS-180-4)',
  defaultTtlSeconds: 20,
  maxGeofenceMeters: 60,
  strictGeofenceEnforced: true,
  hmacSecretKeyMasked: '••••••••••••••••••••••••••••••••9F4C',
  allowManualOverride: true,
  tamperProtectionActive: true,
};

interface ToastNotice {
  id: string;
  message: string;
  type?: 'default' | 'error';
}

interface ConfirmPrompt {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export default function App() {
  const [sessions, setSessions] = useState<ClassSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ClassSession[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_SESSIONS;
  });

  const [scanLogs, setScanLogs] = useState<ScanEventLog[]>(() => {
    try {
      const raw = localStorage.getItem(SCAN_LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScanEventLog[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_SCAN_LOGS;
  });

  const [adminConfig, setAdminConfig] = useState<AdminSystemConfig>(() => {
    try {
      const raw = localStorage.getItem(ADMIN_CONFIG_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_ADMIN_CONFIG, ...(JSON.parse(raw) as Partial<AdminSystemConfig>) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_ADMIN_CONFIG;
  });

  const portalType: 'public' | 'admin' =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
      ? 'admin'
      : 'public';

  const authStorageKey = portalType === 'admin' ? ADMIN_AUTH_KEY : PUBLIC_AUTH_KEY;

  const [currentUser, setCurrentUser] = useState<AuthUserSession | null>(() => {
    try {
      const raw = localStorage.getItem(authStorageKey);
      if (raw) return JSON.parse(raw) as AuthUserSession;
    } catch {
      // Fallback
    }
    return null;
  });

  const [confirmPrompt, setConfirmPrompt] = useState<ConfirmPrompt | null>(null);
  const confirmDialogRef = useRef<HTMLDialogElement | null>(null);
  const [activeScreen, setActiveScreen] = useState<AppScreen>(
    portalType === 'admin' ? 'admin' : 'landing'
  );
  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => sessions[0]?.id ?? 'ses-2841'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [pythonOnline, setPythonOnline] = useState(false);
  const [bgPaused] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Dynamic QR Rotation Engine
  const [rotationInterval, setRotationInterval] = useState<number>(adminConfig.defaultTtlSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(adminConfig.defaultTtlSeconds);
  const [tokenSequence, setTokenSequence] = useState<number>(104);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const showToast = (message: string, type: 'default' | 'error' = 'default') => {
    const id = `toast-${Date.now()}`;
    setToast({ id, message, type });
    window.setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 3600);
  };

  // Check Python FastAPI health
  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status === 'ok') setPythonOnline(true);
      })
      .catch(() => setPythonOnline(false));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Storage quota
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(SCAN_LOGS_STORAGE_KEY, JSON.stringify(scanLogs));
    } catch {
      // Storage quota
    }
  }, [scanLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_CONFIG_STORAGE_KEY, JSON.stringify(adminConfig));
    } catch {
      // Storage quota
    }
  }, [adminConfig]);

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    if (confirmPrompt && !dialog.open) {
      dialog.showModal();
    } else if (!confirmPrompt && dialog.open) {
      dialog.close();
    }
  }, [confirmPrompt]);

  // Detector de parámetros URL generados por el código QR para escaneo externo móvil
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const sessionParam = params.get('session');
      const tokenParam = params.get('token');

      if (sessionParam) {
        const found = sessions.find(
          (s) => s.id === sessionParam || s.cohortCode.toUpperCase() === sessionParam.toUpperCase()
        );
        if (found) {
          setActiveSessionId(found.id);
        }
        setActiveScreen('scanner');
        showToast(
          tokenParam
            ? 'Sesión detectada vía QR móvil. Verifica tu asistencia.'
            : 'Sesión de aula abierta en escáner.'
        );
      }
    } catch {
      // URL parsing fallback
    }
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setTokenSequence((seq) => seq + 1);
          return rotationInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPaused, rotationInterval]);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  }, [sessions, activeSessionId]);

  const currentToken = useMemo(() => {
    return generateRotatingToken(activeSession.cohortCode, tokenSequence);
  }, [activeSession.cohortCode, tokenSequence]);

  const previousToken = useMemo(() => {
    return generateRotatingToken(activeSession.cohortCode, tokenSequence - 1);
  }, [activeSession.cohortCode, tokenSequence]);

  const handleRotateNow = () => {
    setTokenSequence((seq) => seq + 1);
    setSecondsRemaining(rotationInterval);
    showToast(`Token rotado para ${activeSession.cohortCode}`);
  };

  const handleChangeInterval = (seconds: number) => {
    setRotationInterval(seconds);
    setSecondsRemaining(seconds);
    showToast(`Rotación configurada a ${seconds}s`);
  };

  const handleCreateSession = (newSession: ClassSession) => {
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveScreen('projector');
    playFeedbackTone(true);
    showToast(`Sesión ${newSession.cohortCode} creada y proyectada`);
  };

  const handleUpdateSessionSettings = (
    sessionId: string,
    updates: Partial<Pick<ClassSession, 'geofenceRadiusMeters' | 'gracePeriodMinutes' | 'status'>>
  ) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
    );
    showToast('Parámetros de aula actualizados');
  };

  const handleUpdateAdminConfig = (
    updater: AdminSystemConfig | ((prev: AdminSystemConfig) => AdminSystemConfig)
  ) => {
    setAdminConfig((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.defaultTtlSeconds !== prev.defaultTtlSeconds) {
        setRotationInterval(next.defaultTtlSeconds);
        setSecondsRemaining(next.defaultTtlSeconds);
      }
      return next;
    });
    showToast('Políticas de seguridad actualizadas');
  };

  const executeResetDemoData = () => {
    setSessions(INITIAL_SESSIONS);
    setScanLogs(INITIAL_SCAN_LOGS);
    setAdminConfig(DEFAULT_ADMIN_CONFIG);
    setRotationInterval(DEFAULT_ADMIN_CONFIG.defaultTtlSeconds);
    setSecondsRemaining(DEFAULT_ADMIN_CONFIG.defaultTtlSeconds);
    setActiveSessionId(INITIAL_SESSIONS[0].id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SESSIONS));
      localStorage.setItem(SCAN_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_SCAN_LOGS));
      localStorage.setItem(ADMIN_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_CONFIG));
    } catch {
      // ignore
    }
    playFeedbackTone(true);
    showToast('Datos institucionales restablecidos');
  };

  const handleResetDemoData = () => {
    setConfirmPrompt({
      title: '¿Restablecer datos institucionales?',
      description:
        'Se restaurarán las sesiones, asistencias, logs de auditoría y configuración de seguridad a sus valores iniciales.',
      confirmLabel: 'Sí, restablecer',
      onConfirm: executeResetDemoData,
    });
  };

  const handleSetLearnerStatus = (
    sessionId: string,
    learnerId: string,
    status: AttendanceStatus
  ) => {
    const timeStr = formatTimeNow();
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const updatedRecords = session.records.map((rec) => {
          if (rec.learnerId !== learnerId) return rec;
          if (status === AttendanceStatus.ABSENT) {
            return {
              ...rec,
              status: AttendanceStatus.ABSENT,
              checkedInAt: null,
              checkedInDate: null,
              method: CheckInMethod.NONE,
              distanceMeters: null,
              tokenSignature: null,
            };
          }
          return {
            ...rec,
            status,
            checkedInAt: rec.checkedInAt ?? timeStr,
            checkedInDate: rec.checkedInDate ?? formatDateNow(),
            method:
              rec.method === CheckInMethod.NONE
                ? CheckInMethod.INSTRUCTOR_OVERRIDE
                : rec.method,
          };
        });
        return { ...session, records: updatedRecords };
      })
    );
    playFeedbackTone(status !== AttendanceStatus.ABSENT);
  };

  const handleAddLearner = (sessionId: string, learner: Learner) => {
    let added = false;
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const alreadyExists = session.learners.some(
          (l) =>
            l.id === learner.id ||
            l.nationalId.trim().toLowerCase() === learner.nationalId.trim().toLowerCase() ||
            l.fullName.trim().toLowerCase() === learner.fullName.trim().toLowerCase()
        );
        if (alreadyExists) return session;
        added = true;
        return {
          ...session,
          learners: [...session.learners, learner],
          records: [
            ...session.records,
            {
              learnerId: learner.id,
              status: AttendanceStatus.ABSENT,
              checkedInAt: null,
              checkedInDate: null,
              method: CheckInMethod.NONE,
              distanceMeters: null,
              tokenSignature: null,
            },
          ],
        };
      })
    );
    if (added) {
      playFeedbackTone(true);
      showToast(`Aprendiz ${learner.fullName} inscrito`);
    } else {
      showToast(`${learner.fullName} ya está inscrito en esta ficha`, 'error');
    }
  };

  const handleVerifyCheckIn = ({
    sessionId,
    learnerId,
    tokenInput,
    method,
    distanceMeters,
    simulateLate,
  }: {
    sessionId: string;
    learnerId: string;
    tokenInput: string;
    method: CheckInMethod;
    distanceMeters: number;
    simulateLate: boolean;
  }): VerificationResult => {
    const targetSession = sessions.find((s) => s.id === sessionId) ?? activeSession;
    const learner = targetSession.learners.find((l) => l.id === learnerId);
    const existingRecord = targetSession.records.find((r) => r.learnerId === learnerId);
    const expectedToken = generateRotatingToken(targetSession.cohortCode, tokenSequence);
    const nowStr = formatTimeNow();
    const dateStr = formatDateNow();
    const signature = `SIG-${tokenInput.slice(-6)}`;

    // Prevent duplicate attendance records for the same learner in the same session
    if (
      existingRecord &&
      (existingRecord.status === AttendanceStatus.PRESENT ||
        existingRecord.status === AttendanceStatus.LATE)
    ) {
      playFeedbackTone(false);
      const originalDate = existingRecord.checkedInDate || targetSession.dateLabel;
      const originalTime = existingRecord.checkedInAt || 'registrada';
      const log: ScanEventLog = {
        id: `log-${Date.now()}`,
        sessionId: targetSession.id,
        learnerName: learner?.fullName ?? 'Aprendiz desconocido',
        nationalId: learner?.nationalId ?? '—',
        outcome: 'DENIED',
        reason: `Intento duplicado bloqueado (ya registró el ${originalDate} a las ${originalTime})`,
        timestamp: nowStr,
        dateLabel: dateStr,
        distanceMeters,
        tokenUsed: tokenInput,
      };
      setScanLogs((prev) => [log, ...prev].slice(0, 30));
      showToast('Asistencia ya registrada previamente', 'error');
      return {
        outcome: 'DENIED',
        title: 'Asistencia Ya Registrada · Sin Duplicados',
        detail: `${learner?.fullName ?? 'El aprendiz'} ya tiene asistencia registrada en ${targetSession.cohortCode} el ${originalDate} a las ${originalTime} (${existingRecord.tokenSignature ?? 'verificada'}).`,
        timestamp: nowStr,
        learnerName: learner?.fullName,
        nationalId: learner?.nationalId,
        distanceMeters,
        signature: existingRecord.tokenSignature ?? undefined,
      };
    }

    if (targetSession.status === SessionStatus.COMPLETED) {
      playFeedbackTone(false);
      const log: ScanEventLog = {
        id: `log-${Date.now()}`,
        sessionId: targetSession.id,
        learnerName: learner?.fullName ?? 'Aprendiz desconocido',
        nationalId: learner?.nationalId ?? '—',
        outcome: 'DENIED',
        reason: 'Sesión cerrada por el instructor',
        timestamp: nowStr,
        distanceMeters,
        tokenUsed: tokenInput,
      };
      setScanLogs((prev) => [log, ...prev].slice(0, 30));
      return {
        outcome: 'DENIED',
        title: 'Registro Denegado · Sesión Cerrada',
        detail: `${targetSession.title} figura como Finalizada y ya no acepta registros.`,
        timestamp: nowStr,
        learnerName: learner?.fullName,
        nationalId: learner?.nationalId,
        distanceMeters,
      };
    }

    const normalizedInput = tokenInput.trim().toUpperCase();
    const prevToken = generateRotatingToken(targetSession.cohortCode, tokenSequence - 1);
    const isTokenMatch =
      normalizedInput === expectedToken ||
      (!adminConfig.tamperProtectionActive && normalizedInput === prevToken);

    if (!isTokenMatch) {
      playFeedbackTone(false);
      const log: ScanEventLog = {
        id: `log-${Date.now()}`,
        sessionId: targetSession.id,
        learnerName: learner?.fullName ?? 'Aprendiz desconocido',
        nationalId: learner?.nationalId ?? '—',
        outcome: 'DENIED',
        reason: `Firma QR inválida o expirada (${tokenInput})`,
        timestamp: nowStr,
        distanceMeters,
        tokenUsed: tokenInput,
      };
      setScanLogs((prev) => [log, ...prev].slice(0, 30));
      return {
        outcome: 'DENIED',
        title: 'Token QR Inválido o Expirado',
        detail: `El token "${tokenInput}" no coincide con el token activo (${expectedToken}). Escanea nuevamente el proyector.`,
        timestamp: nowStr,
        learnerName: learner?.fullName,
        nationalId: learner?.nationalId,
        distanceMeters,
      };
    }

    const outOfGeofence = distanceMeters > targetSession.geofenceRadiusMeters;
    if (outOfGeofence && adminConfig.strictGeofenceEnforced) {
      playFeedbackTone(false);
      const log: ScanEventLog = {
        id: `log-${Date.now()}`,
        sessionId: targetSession.id,
        learnerName: learner?.fullName ?? 'Aprendiz desconocido',
        nationalId: learner?.nationalId ?? '—',
        outcome: 'DENIED',
        reason: `Fuera de geocerca de ${targetSession.geofenceRadiusMeters}m (${distanceMeters}m)`,
        timestamp: nowStr,
        distanceMeters,
        tokenUsed: tokenInput,
      };
      setScanLogs((prev) => [log, ...prev].slice(0, 30));
      return {
        outcome: 'DENIED',
        title: 'Límite de Geocerca Excedido',
        detail: `El GPS está a ${distanceMeters}m de ${targetSession.room}, superando el perímetro de ${targetSession.geofenceRadiusMeters}m.`,
        timestamp: nowStr,
        learnerName: learner?.fullName,
        nationalId: learner?.nationalId,
        distanceMeters,
      };
    }

    const finalStatus = simulateLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    const outcome = simulateLate ? 'LATE' : 'VERIFIED';
    playFeedbackTone(true);

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== targetSession.id) return session;
        return {
          ...session,
          status:
            session.status === SessionStatus.SCHEDULED
              ? SessionStatus.LIVE
              : session.status,
          records: session.records.map((rec) =>
            rec.learnerId === learnerId
              ? {
                  learnerId,
                  status: finalStatus,
                  checkedInAt: nowStr,
                  checkedInDate: dateStr,
                  method,
                  distanceMeters,
                  tokenSignature: signature,
                }
              : rec
          ),
        };
      })
    );

    const log: ScanEventLog = {
      id: `log-${Date.now()}`,
      sessionId: targetSession.id,
      learnerName: learner?.fullName ?? 'Aprendiz desconocido',
      nationalId: learner?.nationalId ?? '—',
      outcome,
      reason: simulateLate
        ? `Registrado fuera del margen de ${targetSession.gracePeriodMinutes}m vía ${method}`
        : `Verificado vía ${method} dentro de ${targetSession.room}`,
      timestamp: nowStr,
      dateLabel: dateStr,
      distanceMeters,
      tokenUsed: tokenInput,
    };
    setScanLogs((prev) => [log, ...prev].slice(0, 30));

    showToast(
      simulateLate
        ? `Tardanza registrada: ${learner?.fullName}`
        : `Asistencia verificada: ${learner?.fullName}`
    );

    return {
      outcome,
      title: simulateLate ? 'Registro · Tardanza Permitida' : 'Asistencia Verificada (Presente)',
      detail: simulateLate
        ? `Asistencia registrada como Tardanza tras el margen de ${targetSession.gracePeriodMinutes} minutos para ${targetSession.cohortCode}.`
        : `Presencia confirmada para ${targetSession.title} en ${targetSession.room}.`,
      timestamp: nowStr,
      sessionTitle: targetSession.title,
      learnerName: learner?.fullName,
      nationalId: learner?.nationalId,
      distanceMeters,
      signature,
    };
  };

  const handleSimulateProjectorScan = (mode: 'VALID' | 'LATE' | 'OUT_OF_BOUNDS') => {
    const absentLearner =
      activeSession.learners.find((l) => {
        const rec = activeSession.records.find((r) => r.learnerId === l.id);
        return !rec || rec.status === AttendanceStatus.ABSENT;
      }) ?? activeSession.learners[0];

    if (!absentLearner) return;

    const distance =
      mode === 'OUT_OF_BOUNDS' ? activeSession.geofenceRadiusMeters + 65 : 19;

    handleVerifyCheckIn({
      sessionId: activeSession.id,
      learnerId: absentLearner.id,
      tokenInput: currentToken,
      method: CheckInMethod.DYNAMIC_QR,
      distanceMeters: distance,
      simulateLate: mode === 'LATE',
    });
  };

  const handleExportCsv = () => {
    downloadAttendanceCsv(activeSession);
    playFeedbackTone(true);
    showToast(`CSV exportado para ${activeSession.cohortCode}`);
  };

  const handleClearLogs = () => {
    setConfirmPrompt({
      title: '¿Vaciar registro forense de auditoría?',
      description: 'Se eliminarán todos los eventos de escaneo almacenados en el historial actual.',
      confirmLabel: 'Vaciar logs',
      onConfirm: () => {
        setScanLogs([]);
        playFeedbackTone(true);
        showToast('Registro forense de auditoría vaciado');
      },
    });
  };

  const handleSimulateSecurityBreach = () => {
    const spoofLog: ScanEventLog = {
      id: `alert-${Date.now()}`,
      sessionId: activeSession.id,
      learnerName: 'DISPOSITIVO NO AUTORIZADO',
      nationalId: 'IP 190.158.42.11',
      outcome: 'DENIED',
      reason: 'Falsificación de firma HMAC detectada a 420m fuera de geocerca',
      timestamp: formatTimeNow(),
      distanceMeters: 420,
      tokenUsed: 'ACQR-FAKE-HACK99',
    };
    setScanLogs((prev) => [spoofLog, ...prev]);
    playFeedbackTone(false);
    showToast('ALERTA: Intento de suplantación bloqueado', 'error');
  };

  const handleExportFullBackup = () => {
    const backupPayload = {
      institution: 'ACADEQR INSTITUTIONAL ENGINE',
      exportedAt: new Date().toISOString(),
      activeSessionId,
      sessions,
      scanLogs,
      version: '2.5.0',
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acadeqr_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    playFeedbackTone(true);
    showToast('Backup JSON descargado con éxito');
  };

  useEffect(() => {
    const onStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSessions(JSON.parse(e.newValue) as ClassSession[]);
        } catch {
          // ignore
        }
      } else if (e.key === SCAN_LOGS_STORAGE_KEY && e.newValue) {
        try {
          setScanLogs(JSON.parse(e.newValue) as ScanEventLog[]);
        } catch {
          // ignore
        }
      } else if (e.key === ADMIN_CONFIG_STORAGE_KEY && e.newValue) {
        try {
          setAdminConfig(JSON.parse(e.newValue) as AdminSystemConfig);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorageSync);
    return () => window.removeEventListener('storage', onStorageSync);
  }, []);

  const handleAuthenticated = (user: AuthUserSession) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(authStorageKey, JSON.stringify(user));
    } catch {
      // ignore
    }
    if (portalType === 'admin') {
      if (user.companyName) {
        setAdminConfig((prev) => ({ ...prev, institutionName: user.companyName! }));
      }
      setActiveScreen('admin');
    } else {
      setActiveScreen(user.role === 'APRENDIZ' ? 'scanner' : 'landing');
    }
    playFeedbackTone(true);
    showToast(`Bienvenido, ${user.name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(authStorageKey);
    } catch {
      // ignore
    }
    setMobileMenuOpen(false);
    showToast('Sesión cerrada');
  };

  const navItems: { id: AppScreen; label: string }[] = useMemo(() => {
    if (!currentUser) return [];
    if (portalType === 'admin') {
      return [
        { id: 'admin', label: 'Monitor Admin' },
        { id: 'overview', label: 'Resumen Empresa' },
        { id: 'roster', label: 'Auditoría Listados' },
      ];
    }
    if (currentUser.role === 'APRENDIZ') {
      return [
        { id: 'landing', label: 'Inicio' },
        { id: 'scanner', label: 'Escáner QR' },
        { id: 'my-attendance', label: 'Mis Asistencias' },
      ];
    }
    return [
      { id: 'landing', label: 'Inicio' },
      { id: 'overview', label: 'Resumen' },
      { id: 'projector', label: 'Proyector QR' },
      { id: 'scanner', label: 'Escáner' },
      { id: 'roster', label: 'Registro' },
    ];
  }, [currentUser, portalType]);

  return (
    <div className="min-h-screen flex flex-col text-slate-100 relative">
      {/* Global Three.js Interactive 3D Background */}
      <ThreeBackground intensity={activeScreen === 'landing' ? 'hero' : 'subtle'} paused={bgPaused} />

      {/* Toast Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-4 sm:right-8 z-50 rounded-xl px-4 py-3 flex items-center gap-3 text-xs font-semibold shadow-2xl border backdrop-blur-xl animate-fade-in ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/90 border-emerald-500/40 text-emerald-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              toast.type === 'error' ? 'bg-rose-400' : 'bg-emerald-400'
            }`}
            aria-hidden="true"
          />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#060b14]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => setActiveScreen(portalType === 'admin' ? 'admin' : 'landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
                portalType === 'admin'
                  ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-indigo-500/20'
                  : 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {portalType === 'admin' ? <Building2 className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                Acade<span className={portalType === 'admin' ? 'text-indigo-400' : 'text-emerald-400'}>QR</span>
              </span>
              <span
                className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  portalType === 'admin'
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {portalType === 'admin' ? 'Admin Empresa' : 'Portal Usuarios'}
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          {currentUser && (
            <nav
              aria-label="Navegación principal"
              className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800"
            >
              {navItems.map((item) => {
                const active = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveScreen(item.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? portalType === 'admin'
                          ? 'bg-indigo-500 text-white font-bold shadow-sm'
                          : 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <div className="hidden lg:flex flex-col items-end mr-1">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 leading-tight">
                    {portalType === 'admin'
                      ? currentUser.companyName ?? adminConfig.institutionName
                      : currentUser.role}
                  </span>
                </div>

                {currentUser.role !== 'APRENDIZ' && (
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="h-9 px-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Exportar CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((o) => !o)}
                  aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                  className="md:hidden w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white cursor-pointer"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <a
                href={portalType === 'admin' ? '/' : '/admin'}
                className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {portalType === 'admin' ? 'Ir a Portal Usuarios' : 'Portal Admin Empresa'}
              </a>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {currentUser && mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#060b14]/95 backdrop-blur-xl px-4 py-4 space-y-1.5">
            {navItems.map((item) => {
              const active = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveScreen(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-8 py-8 sm:py-10 pb-28">
        {!currentUser ? (
          <AuthPortalScreen portalType={portalType} onAuthenticated={handleAuthenticated} />
        ) : (
        <Suspense fallback={<PageSkeleton />}>
          {activeScreen === 'landing' && (
            <LandingPage
              onOpenProjector={() =>
                setActiveScreen(currentUser.role === 'APRENDIZ' ? 'scanner' : 'projector')
              }
              onOpenScanner={() => setActiveScreen('scanner')}
              onOpenOverview={() =>
                setActiveScreen(currentUser.role === 'APRENDIZ' ? 'my-attendance' : 'overview')
              }
              onOpenAdmin={() =>
                setActiveScreen(currentUser.role === 'APRENDIZ' ? 'my-attendance' : 'overview')
              }
              pythonOnline={pythonOnline}
              currentToken={currentToken}
            />
          )}

          {activeScreen === 'overview' && currentUser.role !== 'APRENDIZ' && (
            <OverviewScreen
              sessions={sessions}
              onSelectSessionForProjector={(id) => {
                setActiveSessionId(id);
                setActiveScreen('projector');
              }}
              onSelectSessionForScanner={(id) => {
                setActiveSessionId(id);
                setActiveScreen('scanner');
              }}
              onSelectSessionForRoster={(id) => {
                setActiveSessionId(id);
                setActiveScreen('roster');
              }}
              onCreateSession={handleCreateSession}
              onUpdateSessionStatus={(id, status) => {
                handleUpdateSessionSettings(id, { status });
              }}
              onResetDemoData={handleResetDemoData}
            />
          )}

          {activeScreen === 'projector' && currentUser.role !== 'APRENDIZ' && (
            <QrProjectorScreen
              sessions={sessions}
              activeSession={activeSession}
              onSelectSession={setActiveSessionId}
              currentToken={currentToken}
              secondsRemaining={secondsRemaining}
              rotationInterval={rotationInterval}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused((p) => !p)}
              onRotateNow={handleRotateNow}
              onChangeInterval={handleChangeInterval}
              onUpdateSessionSettings={handleUpdateSessionSettings}
              scanLogs={scanLogs}
              onSimulateScan={handleSimulateProjectorScan}
              onOpenScanner={() => setActiveScreen('scanner')}
            />
          )}

          {activeScreen === 'scanner' && (
            <ScannerScreen
              sessions={sessions}
              activeSession={activeSession}
              onSelectSession={setActiveSessionId}
              currentToken={currentToken}
              previousToken={previousToken}
              onVerifyCheckIn={handleVerifyCheckIn}
              onBackToProjector={() => setActiveScreen('projector')}
              onGoToRoster={
                currentUser.role !== 'APRENDIZ'
                  ? () => setActiveScreen('roster')
                  : undefined
              }
              currentUser={currentUser}
              onEnrollLearner={handleAddLearner}
            />
          )}

          {activeScreen === 'my-attendance' && (
            <LearnerAttendanceScreen
              currentUser={currentUser}
              sessions={sessions}
              scanLogs={scanLogs}
              onGoToScanner={() => setActiveScreen('scanner')}
            />
          )}

          {activeScreen === 'roster' && currentUser.role !== 'APRENDIZ' && (
            <RosterScreen
              sessions={sessions}
              activeSession={activeSession}
              onSelectSession={setActiveSessionId}
              onSetLearnerStatus={handleSetLearnerStatus}
              onAddLearner={handleAddLearner}
              allowManualOverride={adminConfig.allowManualOverride}
            />
          )}

          {activeScreen === 'admin' && portalType === 'admin' && (
            <AdminScreen
              sessions={sessions}
              scanLogs={scanLogs}
              adminConfig={adminConfig}
              onUpdateAdminConfig={handleUpdateAdminConfig}
              onClearLogs={handleClearLogs}
              onSimulateSecurityBreach={handleSimulateSecurityBreach}
              onResetDemoData={handleResetDemoData}
              onExportFullBackup={handleExportFullBackup}
            />
          )}
        </Suspense>
        )}
      </main>

      {/* Bottom Live Status Bar */}
      <footer
        aria-label="Barra de estado en vivo"
        className="fixed bottom-0 left-0 right-0 z-30 bg-[#060b14]/85 backdrop-blur-xl border-t border-slate-800/80"
      >
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-xs">
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <span className="font-mono-tabular text-slate-300">
              <strong className="text-white">{activeSession.cohortCode}</strong> · {activeSession.room}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono-tabular text-slate-300 shrink-0">
            <span className="text-slate-500">Token:</span>
            <span className="text-emerald-300 font-bold">{currentToken}</span>
            <span className="text-slate-500">({secondsRemaining}s)</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                pythonOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-400">
              {pythonOnline ? 'Python QR Engine: En Línea' : 'Python QR Engine: Esperando'}
            </span>
          </div>
        </div>
      </footer>
      {/* Confirmation Dialog (Native Top-Layer) */}
      <dialog
        ref={confirmDialogRef}
        aria-labelledby="confirm-dialog-title"
        {...({ closedby: 'any' } as Record<string, string>)}
        onClose={() => {
          const dialog = confirmDialogRef.current;
          if (!dialog) return;
          const action = dialog.returnValue;
          dialog.returnValue = '';
          if (action === 'confirm' && confirmPrompt) {
            confirmPrompt.onConfirm();
          }
          setConfirmPrompt(null);
        }}
      >
        {confirmPrompt && (
          <form method="dialog" className="p-6 space-y-5">
            <div className="space-y-2">
              <h2 id="confirm-dialog-title" className="text-lg font-bold text-white">
                {confirmPrompt.title}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {confirmPrompt.description}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="submit"
                value="cancel"
                autoFocus
                className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                value="confirm"
                className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {confirmPrompt.confirmLabel}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
