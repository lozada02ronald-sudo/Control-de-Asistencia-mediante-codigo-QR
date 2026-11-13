import { useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid,
  QrCode,
  ScanLine,
  Users,
  Download,
} from 'lucide-react';
import {
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
  formatTimeNow,
  generateRotatingToken,
} from './data/mockInstitution';
import { OverviewScreen } from './components/OverviewScreen';
import { QrProjectorScreen } from './components/QrProjectorScreen';
import { ScannerScreen } from './components/ScannerScreen';
import { RosterScreen } from './components/RosterScreen';

const STORAGE_KEY = 'acadeqr_sessions_v1';

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
      // Fallback to initial dataset
    }
    return INITIAL_SESSIONS;
  });

  const [scanLogs, setScanLogs] = useState<ScanEventLog[]>(INITIAL_SCAN_LOGS);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('overview');
  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => sessions[0]?.id ?? 'ses-2841'
  );

  // Dynamic QR Rotation Engine
  const [rotationInterval, setRotationInterval] = useState<number>(20);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [tokenSequence, setTokenSequence] = useState<number>(104);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore storage quota issues
    }
  }, [sessions]);

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
  };

  const handleChangeInterval = (seconds: number) => {
    setRotationInterval(seconds);
    setSecondsRemaining(seconds);
  };

  const handleCreateSession = (newSession: ClassSession) => {
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveScreen('projector');
  };

  const handleUpdateSessionSettings = (
    sessionId: string,
    updates: Partial<Pick<ClassSession, 'geofenceRadiusMeters' | 'gracePeriodMinutes' | 'status'>>
  ) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
    );
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
              method: CheckInMethod.NONE,
              distanceMeters: null,
              tokenSignature: null,
            };
          }
          return {
            ...rec,
            status,
            checkedInAt: rec.checkedInAt ?? timeStr,
            method:
              rec.method === CheckInMethod.NONE
                ? CheckInMethod.INSTRUCTOR_OVERRIDE
                : rec.method,
          };
        });
        return { ...session, records: updatedRecords };
      })
    );
  };

  const handleAddLearner = (sessionId: string, learner: Learner) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          learners: [...session.learners, learner],
          records: [
            ...session.records,
            {
              learnerId: learner.id,
              status: AttendanceStatus.ABSENT,
              checkedInAt: null,
              method: CheckInMethod.NONE,
              distanceMeters: null,
              tokenSignature: null,
            },
          ],
        };
      })
    );
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
    const expectedToken = generateRotatingToken(targetSession.cohortCode, tokenSequence);
    const nowStr = formatTimeNow();
    const signature = `SIG-${tokenInput.slice(-6)}`;

    // 1. Validate Session Live Status
    if (targetSession.status === SessionStatus.COMPLETED) {
      const log: ScanEventLog = {
        id: `log-${Date.now()}`,
        sessionId: targetSession.id,
        learnerName: learner?.fullName ?? 'Unknown Learner',
        nationalId: learner?.nationalId ?? '—',
        outcome: 'DENIED',
        reason: 'Session already closed by instructor',
        timestamp: nowStr,
        distanceMeters,
        tokenUsed: tokenInput,
      };
      setScanLogs((prev) => [log, ...prev].slice(0, 30));
      return {
        outcome: 'DENIED',
        title: 'Check-In Denied · Session Closed',
        detail: `${targetSession.title} is marked Completed and no longer accepts QR check-ins.`,
        timestamp: nowStr,
        learnerName: learner?.fullName,
        nationalId: learner?.nationalId,
        distanceMeters,
      };
    }

    // 2. Validate Cryptographic Token
    if (tokenInput.trim().toUpperCase() !== expectedToken) {
      const log: ScanEventLog = {
        id: `log-${Date.now()}`,
        sessionId: targetSession.id,
        learnerName: learner?.fullName ?? 'Unknown Learner',
        nationalId: learner?.nationalId ?? '—',
        outcome: 'DENIED',
        reason: `Expired or invalid QR signature (${tokenInput})`,
        timestamp: nowStr,
        distanceMeters,
        tokenUsed: tokenInput,
      };
      setScanLogs((prev) => [log, ...prev].slice(0, 30));
      return {
        outcome: 'DENIED',
        title: 'Invalid or Expired QR Token',
        detail: `Submitted token "${tokenInput}" does not match the active rotating classroom token (${expectedToken}). Ask the learner to re-scan the projector.`,
        timestamp: nowStr,
        learnerName: learner?.fullName,
        nationalId: learner?.nationalId,
        distanceMeters,
      };
    }

    // 3. Validate Geofence Perimeter
    if (distanceMeters > targetSession.geofenceRadiusMeters) {
      const log: ScanEventLog = {
        id: `log-${Date.now()}`,
        sessionId: targetSession.id,
        learnerName: learner?.fullName ?? 'Unknown Learner',
        nationalId: learner?.nationalId ?? '—',
        outcome: 'DENIED',
        reason: `Outside ${targetSession.geofenceRadiusMeters}m classroom geofence (${distanceMeters}m away)`,
        timestamp: nowStr,
        distanceMeters,
        tokenUsed: tokenInput,
      };
      setScanLogs((prev) => [log, ...prev].slice(0, 30));
      return {
        outcome: 'DENIED',
        title: 'Geofence Boundary Exceeded',
        detail: `Device GPS is ${distanceMeters}m from ${targetSession.room}, exceeding the ${targetSession.geofenceRadiusMeters}m classroom perimeter.`,
        timestamp: nowStr,
        learnerName: learner?.fullName,
        nationalId: learner?.nationalId,
        distanceMeters,
      };
    }

    // 4. Verified Present or Late Grace
    const finalStatus = simulateLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    const outcome = simulateLate ? 'LATE' : 'VERIFIED';

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
      learnerName: learner?.fullName ?? 'Unknown Learner',
      nationalId: learner?.nationalId ?? '—',
      outcome,
      reason: simulateLate
        ? `Checked in past ${targetSession.gracePeriodMinutes}m grace threshold via ${method}`
        : `Verified via ${method} inside ${targetSession.room} perimeter`,
      timestamp: nowStr,
      distanceMeters,
      tokenUsed: tokenInput,
    };
    setScanLogs((prev) => [log, ...prev].slice(0, 30));

    return {
      outcome,
      title: simulateLate ? 'Checked In · Late Grace Period' : 'Attendance Verified Present',
      detail: simulateLate
        ? `Presence recorded as Late after the ${targetSession.gracePeriodMinutes}-minute grace window for ${targetSession.cohortCode}.`
        : `Presence cryptographically confirmed for ${targetSession.title} in ${targetSession.room}.`,
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

  const navItems: { id: AppScreen; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'projector', label: 'QR Projector', icon: QrCode },
    { id: 'scanner', label: 'Scanner', icon: ScanLine },
    { id: 'roster', label: 'Cohort Roster', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#131b2e]">
      {/* Desktop & Mobile Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 glass-light border-b border-slate-200/80">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveScreen('overview')}
            className="text-lg font-bold tracking-tight text-[#131b2e] whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span className="w-7 h-7 rounded-lg bg-[#059669] text-white inline-flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </span>
            <span>AcadeQR</span>
          </button>

          {/* Zone 2: Single-line Nav Links (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6"
          >
            {navItems.map((item) => {
              const active = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveScreen(item.id)}
                  className={`py-2 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors border-b-2 ${
                    active
                      ? 'text-[#006948] border-[#059669]'
                      : 'text-[#3d4a42] border-transparent hover:text-[#131b2e]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => downloadAttendanceCsv(activeSession)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#059669] hover:bg-[#006948] active:scale-[0.98] text-white text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
        {activeScreen === 'overview' && (
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
          />
        )}

        {activeScreen === 'projector' && (
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
          />
        )}

        {activeScreen === 'roster' && (
          <RosterScreen
            sessions={sessions}
            activeSession={activeSession}
            onSelectSession={setActiveSessionId}
            onSetLearnerStatus={handleSetLearnerStatus}
            onAddLearner={handleAddLearner}
          />
        )}
      </main>

      {/* Mobile Bottom Ergonomic Thumb-Zone Navigation (<= 15% viewport cap) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-light border-t border-slate-200/90"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveScreen(item.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] gap-1 cursor-pointer transition-colors ${
                  active ? 'text-[#006948]' : 'text-[#6d7a72] hover:text-[#131b2e]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                  {item.label === 'Cohort Roster' ? 'Roster' : item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
