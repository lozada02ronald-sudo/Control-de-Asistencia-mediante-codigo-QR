import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  apiClient,
  getStoredJwtToken,
  mapApiSessionToClassSession,
  setStoredJwtToken,
} from './services/apiClient';
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
import { AuthPortalScreen, AuthUserSession } from './components/AuthPortalScreen';
import { CampusHome, CampusBrand } from './components/CampusHome';
import { Building2, Download, GraduationCap, LogOut, Menu, QrCode, X } from 'lucide-react';

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
const StudentIdCardScreen = lazy(() =>
  import('./components/StudentIdCardScreen').then((m) => ({
    default: m.StudentIdCardScreen,
  })),
);
const ModulesAndAiScreen = lazy(() =>
  import('./components/ModulesAndAiScreen').then((m) => ({
    default: m.ModulesAndAiScreen,
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
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const name = parsed.name || parsed.fullName || parsed.nombre || parsed.email?.split('@')[0] || 'Usuario';
          const role = (parsed.role === 'ADMIN' || parsed.role === 'INSTRUCTOR') ? parsed.role : 'APRENDIZ';
          const id = parsed.id || 'usr-default';
          const email = parsed.email || 'usuario@politecnico.edu.co';
          return {
            ...parsed,
            id,
            name,
            email,
            role,
          } as AuthUserSession;
        }
      }
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeScreen]);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [pythonOnline, setPythonOnline] = useState(false);

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

  // Check Python FastAPI health and hydrate live session + courses when authenticated
  useEffect(() => {
    let cancelled = false;
    apiClient
      .health()
      .then(async (data) => {
        if (cancelled) return;
        if (data?.status === 'online' || data?.status === 'ok') {
          setPythonOnline(true);
          const token = getStoredJwtToken();
          if (!token) return;
          try {
            const me = await apiClient.auth.me();
            if (!cancelled && me?.usuario) {
              setCurrentUser((prev) => ({
                id: me.usuario.id,
                name: me.usuario.nombre,
                email: me.usuario.email,
                nationalId: me.usuario.documento ?? prev?.nationalId,
                role: me.usuario.rol,
                programName: me.usuario.programa ?? prev?.programName,
                campus: me.usuario.sede ?? prev?.campus,
                companyName: prev?.companyName,
              }));
            }
            const res = await apiClient.sessions.list();
            if (!cancelled && Array.isArray(res?.sesiones) && res.sesiones.length > 0) {
              const detailed = await Promise.all(
                res.sesiones.slice(0, 12).map(async (s) => {
                  try {
                    const detail = await apiClient.sessions.detail(s.id);
                    return mapApiSessionToClassSession(s, detail.asistencias);
                  } catch {
                    return mapApiSessionToClassSession(s);
                  }
                })
              );
              if (!cancelled && detailed.length > 0) {
                setSessions(detailed);
                setActiveSessionId((cur) =>
                  detailed.some((d) => d.id === cur) ? cur : detailed[0].id
                );
              }
            }
          } catch {
            // Token expired or invalid; keep local fallback without disrupting UI
            setStoredJwtToken(null);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPythonOnline(false);
      });
    return () => {
      cancelled = true;
    };
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
    if (pythonOnline && getStoredJwtToken()) {
      apiClient.qr.rotate(activeSession.id, rotationInterval).catch(() => {
        // Offline fallback already rotated locally
      });
    }
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

    if (pythonOnline && getStoredJwtToken()) {
      apiClient.sessions
        .create({
          codigo_cohorte: newSession.cohortCode,
          nombre: newSession.title,
          departamento: newSession.department,
          sede: newSession.campus,
          aula: newSession.room,
          hora_inicio: `${newSession.startTime}:00`,
          hora_fin: `${newSession.endTime}:00`,
          geocerca_metros: newSession.geofenceRadiusMeters,
          gracia_minutos: newSession.gracePeriodMinutes,
        })
        .then((res) => {
          if (res?.sesion_id) {
            setSessions((prev) =>
              prev.map((s) => (s.id === newSession.id ? { ...s, id: res.sesion_id } : s))
            );
            setActiveSessionId(res.sesion_id);
          }
        })
        .catch(() => {
          showToast('Sesión guardada localmente (sin sincronización API)', 'error');
        });
    }
  };

  const handleUpdateSessionSettings = (
    sessionId: string,
    updates: Partial<Pick<ClassSession, 'geofenceRadiusMeters' | 'gracePeriodMinutes' | 'status'>>
  ) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
    );
    if (pythonOnline && getStoredJwtToken()) {
      apiClient.sessions
        .update(sessionId, {
          geocerca_metros: updates.geofenceRadiusMeters,
          gracia_minutos: updates.gracePeriodMinutes,
          activa:
            updates.status !== undefined
              ? updates.status === SessionStatus.LIVE
              : undefined,
        })
        .catch(() => {
          // Local state updated
        });
    }
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

    if (user.programId) {
      setActiveSessionId(user.programId);
      if (user.role === 'APRENDIZ') {
        const target = sessions.find((s) => s.id === user.programId);
        if (target) {
          handleAddLearner(target.id, {
            id: user.id,
            fullName: user.name,
            nationalId: user.nationalId ?? `CC ${Math.floor(1000000000 + Math.random() * 89999999)}`,
            program: target.title,
            avatarColor: '#059669',
          });
        }
      }
    }

    if (portalType === 'admin') {
      if (user.companyName) {
        setAdminConfig((prev) => ({ ...prev, institutionName: user.companyName! }));
      }
      setActiveScreen('admin');
    } else if (user.role === 'INSTRUCTOR') {
      setActiveScreen('overview');
    } else {
      setActiveScreen(user.role === 'APRENDIZ' ? 'scanner' : 'landing');
    }
    playFeedbackTone(true);
    showToast(`Bienvenido, ${user.name}`);
  };

  const instructorSessions = useMemo(() => {
    if (portalType === 'admin' || currentUser?.role !== 'INSTRUCTOR') return sessions;
    const matched = sessions.filter(
      (s) =>
        (currentUser.programId && s.id === currentUser.programId) ||
        s.instructor.toLowerCase().includes(currentUser.name.trim().toLowerCase())
    );
    return matched.length > 0 ? matched : sessions;
  }, [sessions, currentUser, portalType]);

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
        { id: 'landing', label: 'Portal Universitario' },
        { id: 'admin', label: 'Administración' },
        { id: 'overview', label: 'Resumen' },
        { id: 'projector', label: 'Proyector QR' },
        { id: 'scanner', label: 'Escáner' },
        { id: 'roster', label: 'Asistencias' },
        { id: 'student-card', label: 'Carnet QR' },
        { id: 'modules', label: 'Módulos' },
      ];
    }
    if (currentUser.role === 'APRENDIZ') {
      return [
        { id: 'landing', label: 'Portal Universitario' },
        { id: 'scanner', label: 'Escáner QR' },
        { id: 'my-attendance', label: 'Mis Asistencias' },
        { id: 'student-card', label: 'Carnet QR' },
      ];
    }
    return [
      { id: 'landing', label: 'Portal Universitario' },
      { id: 'overview', label: 'Resumen' },
      { id: 'projector', label: 'Proyector QR' },
      { id: 'scanner', label: 'Escáner' },
      { id: 'roster', label: 'Registro de Asistencia' },
      { id: 'modules', label: 'Gestión Académica' },
    ];
  }, [currentUser, portalType]);

  if (activeScreen === 'landing') {
    return (
      <CampusHome
        currentUser={currentUser}
        onNavigateToDashboard={() => {
          if (!currentUser) {
            setActiveScreen('acceso');
          } else {
            setActiveScreen(
              currentUser.role === 'APRENDIZ'
                ? 'scanner'
                : currentUser.role === 'ADMIN'
                ? 'admin'
                : 'overview'
            );
          }
        }}
        onNavigateToLogin={() => setActiveScreen('acceso')}
        onLogout={handleLogout}
      />
    );
  }

  if (activeScreen === 'acceso' || (!currentUser && portalType === 'public')) {
    return (
      <div className="campus-public campus-access">
        <header className="campus-header">
          <div className="campus-container campus-nav">
            <CampusBrand />
            <button
              type="button"
              onClick={() => setActiveScreen('landing')}
              className="campus-button campus-button-outline"
            >
              Volver al inicio
            </button>
          </div>
        </header>
        <main className="campus-container campus-access-main">
          <AuthPortalScreen
            portalType="public"
            sessions={sessions}
            onAuthenticated={handleAuthenticated}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-800">

      {/* Toast Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-4 sm:right-8 z-50 rounded-xl px-4 py-3 flex items-center gap-3 text-xs font-semibold shadow-2xl border backdrop-blur-xl animate-fade-in ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-[#142B49]/95 border-blue-500/40 text-blue-100'
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
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#2563EB] focus:text-white focus:px-4 focus:py-2 focus:font-bold"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b border-white/15 bg-[#142B49] text-white shadow-lg shadow-[#142B49]/20">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 min-h-[4.5rem] flex items-center justify-between gap-4">
          <a
            href="/"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              setActiveScreen('landing');
              setMobileMenuOpen(false);
            }}
            className="flex shrink-0 items-center gap-3 text-white transition-opacity hover:opacity-95 group"
          >
            <div className="relative flex size-10 items-center justify-center rounded-xl bg-[#2563EB] text-white font-mono font-black shadow-md shadow-blue-600/30">
              <QrCode className="size-5 text-white" />
              <GraduationCap className="size-3.5 text-white absolute -bottom-1 -right-1 bg-[#142B49] rounded-md p-0.5 border border-[#2563EB]" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>Acade</span>
                <span className="text-[#60A5FA] font-black">QR</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-blue-200 font-bold uppercase tracking-wider ml-0.5">
                  SENA ADSO
                </span>
              </span>
              <span className="mt-1 text-[11px] tracking-wider text-slate-300 font-medium">
                Gestión de Asistencia
              </span>
            </span>
          </a>

          {/* Desktop Navigation */}
          {currentUser && (
            <nav
              aria-label="Navegación principal"
              className="hidden min-[1100px]:flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0D1E34]/85 p-1 backdrop-blur-xl shadow-md"
            >
              {navItems.map((item) => {
                const active = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveScreen(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <div className="hidden min-[1260px]:flex items-center gap-2.5 mr-2 pl-3 border-l border-white/15">
                  <div className="size-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-bold text-xs text-white">
                    {((currentUser.name || 'US').trim() || 'US').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[130px] truncate text-xs font-bold text-white">
                        {currentUser.name || 'Usuario'}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-200 border border-blue-400/30">
                        {currentUser.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 truncate max-w-[150px]">
                      {portalType === 'admin'
                        ? currentUser.companyName ?? adminConfig.institutionName
                        : currentUser.programName ?? 'Formación Universitaria'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveScreen('landing')}
                  className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Ver portal público de inicio"
                >
                  <span>🌐 Portal Público</span>
                </button>

                {currentUser.role !== 'APRENDIZ' && (
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-300" />
                    <span className="hidden sm:inline">Exportar CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="h-8 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-100 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((o) => !o)}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-navigation"
                  aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                  className="min-[1100px]:hidden size-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white cursor-pointer"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <a
                href={portalType === 'admin' ? '/' : '/admin'}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white transition-all hover:bg-white/20 sm:px-4"
              >
                <Building2 className="size-4 shrink-0 text-blue-300" aria-hidden="true" />
                {portalType === 'admin' ? 'Portal Académico' : 'Portal Administrativo'}
              </a>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {currentUser && mobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Navegación principal"
            className="min-[1100px]:hidden border-t border-white/15 bg-[#0D1E34] px-4 py-4 space-y-1.5"
          >
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
                  aria-current={active ? 'page' : undefined}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[#2563EB] text-white font-bold'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main id="contenido" tabIndex={-1} className="flex-1 w-full max-w-[1360px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {!currentUser ? (
          <AuthPortalScreen
            portalType={portalType}
            sessions={sessions}
            onAuthenticated={handleAuthenticated}
          />
        ) : (
          <Suspense fallback={<PageSkeleton />}>
            {activeScreen === 'overview' && currentUser.role === 'APRENDIZ' && (
              <LearnerAttendanceScreen
                currentUser={currentUser}
                sessions={sessions}
                scanLogs={scanLogs}
                onGoToScanner={() => setActiveScreen('scanner')}
              />
            )}

            {activeScreen === 'overview' && currentUser.role !== 'APRENDIZ' && (
              <OverviewScreen
                sessions={instructorSessions}
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
                sessions={instructorSessions}
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

            {activeScreen === 'student-card' && (
              <StudentIdCardScreen
                currentUser={currentUser}
                sessions={sessions}
                institutionName={adminConfig.institutionName}
              />
            )}

            {activeScreen === 'roster' && currentUser.role !== 'APRENDIZ' && (
              <RosterScreen
                sessions={instructorSessions}
                activeSession={activeSession}
                onSelectSession={setActiveSessionId}
                onSetLearnerStatus={handleSetLearnerStatus}
                onAddLearner={handleAddLearner}
                allowManualOverride={adminConfig.allowManualOverride}
              />
            )}

            {activeScreen === 'modules' && currentUser.role !== 'APRENDIZ' && (
              <ModulesAndAiScreen
                sessions={instructorSessions}
                scanLogs={scanLogs}
                currentToken={currentToken}
                onCreateSession={handleCreateSession}
                onAddLearner={handleAddLearner}
                onUpdateSessionStatus={(id, status) => {
                  handleUpdateSessionSettings(id, { status });
                }}
                onOpenProjector={(id) => {
                  setActiveSessionId(id);
                  setActiveScreen('projector');
                }}
                onOpenRoster={(id) => {
                  setActiveSessionId(id);
                  setActiveScreen('roster');
                }}
              />
            )}

            {activeScreen === 'admin' && portalType === 'admin' && (
              <AdminScreen
                sessions={sessions}
                scanLogs={scanLogs}
                adminConfig={adminConfig}
                pythonOnline={pythonOnline}
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

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-sm text-slate-600 sm:px-8">
          <span><strong className="text-[#142B49]">AcadeQR</strong> · Sistema de Gestión de Asistencia · ADSO SENA</span>
          {currentUser && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {activeScreen === 'projector' && (
                <span className="font-mono-tabular text-slate-800 font-semibold">{activeSession.cohortCode} · {activeSession.room}</span>
              )}
              <span className="inline-flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${pythonOnline ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  aria-hidden="true"
                />
                {pythonOnline ? 'Servicio QR conectado' : 'Servicio QR en modo local'}
              </span>
            </div>
          )}
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
              <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-100">
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

      {/* Floating Live Screen Showcase Switcher */}
      {currentUser && (
        <aside
          aria-label="Selector rápido de pantallas"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#142B49]/95 border border-white/20 backdrop-blur-2xl shadow-2xl shadow-navy-950/40 max-w-[95vw] overflow-x-auto text-white"
        >
          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider px-2 hidden sm:inline">
            Vistas:
          </span>
          {[
            { id: 'landing', label: 'Inicio', icon: '🏠' },
            { id: 'overview', label: 'Resumen', icon: '📊' },
            { id: 'projector', label: 'Proyector QR', icon: '📽️' },
            { id: 'scanner', label: 'Escáner', icon: '📱' },
            { id: 'roster', label: 'Asistencias', icon: '📋' },
            { id: 'student-card', label: 'Carnet QR', icon: '🪪' },
            { id: 'modules', label: 'Módulos', icon: '🧩' },
            { id: 'admin', label: 'Admin', icon: '🛡️' },
          ].map((view) => {
            const active = activeScreen === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveScreen(view.id as AppScreen)}
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{view.icon}</span>
                <span>{view.label}</span>
              </button>
            );
          })}
        </aside>
      )}
    </div>
  );
}
