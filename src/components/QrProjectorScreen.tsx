import React, { useState } from 'react';
import {
  RefreshCw,
  Pause,
  Play,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  MapPin,
  Clock,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Radio,
} from 'lucide-react';
import {
  ClassSession,
  ScanEventLog,
  SessionStatus,
} from '../types/attendance';
import { QrMatrix } from './QrMatrix';
import { SessionStatusBadge } from './StatusBadge';

interface QrProjectorScreenProps {
  sessions: ClassSession[];
  activeSession: ClassSession;
  onSelectSession: (sessionId: string) => void;
  currentToken: string;
  secondsRemaining: number;
  rotationInterval: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onRotateNow: () => void;
  onChangeInterval: (seconds: number) => void;
  onUpdateSessionSettings: (
    sessionId: string,
    updates: Partial<Pick<ClassSession, 'geofenceRadiusMeters' | 'gracePeriodMinutes' | 'status'>>
  ) => void;
  scanLogs: ScanEventLog[];
  onSimulateScan: (mode: 'VALID' | 'LATE' | 'OUT_OF_BOUNDS') => void;
  onOpenScanner: () => void;
}

export const QrProjectorScreen: React.FC<QrProjectorScreenProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  currentToken,
  secondsRemaining,
  rotationInterval,
  isPaused,
  onTogglePause,
  onRotateNow,
  onChangeInterval,
  onUpdateSessionSettings,
  scanLogs,
  onSimulateScan,
  onOpenScanner,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const progressRatio = Math.max(0, Math.min(1, secondsRemaining / rotationInterval));
  const ringRadius = 26;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const qrPayload = JSON.stringify({
    v: 1,
    sessionId: activeSession.id,
    cohort: activeSession.cohortCode,
    token: currentToken,
    room: activeSession.room,
  });

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(currentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const sessionLogs = scanLogs.filter((l) => l.sessionId === activeSession.id);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-3xl flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-[#68dba9] tracking-wide">
              {activeSession.cohortCode} · {activeSession.room}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
              {activeSession.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Exit Fullscreen</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center">
          <QrMatrix value={qrPayload} size={320} />
          <div className="mt-6 flex items-center gap-4">
            <span className="font-mono-tabular text-xl font-bold text-[#0f172a] tracking-wider">
              {currentToken}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d1fae5] px-3 py-1 text-xs font-bold text-[#065f46] font-mono-tabular">
              {String(secondsRemaining).padStart(2, '0')}s
            </span>
          </div>
        </div>

        <p className="mt-6 text-sm text-slate-300 text-center max-w-md">
          Scan with the AcadeQR Learner Scanner within {activeSession.geofenceRadiusMeters}m of {activeSession.room}. Tokens rotate automatically every {rotationInterval} seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Session Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#006948] tracking-wide mb-1">
            Instructor Classroom Projection
          </p>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#131b2e] leading-tight">
            Dynamic QR Token Projector
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            aria-label="Select active session"
            value={activeSession.id}
            onChange={(e) => onSelectSession(e.target.value)}
            className="institutional-input text-sm font-semibold text-[#131b2e] min-w-[260px]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.cohortCode} — {s.title}
              </option>
            ))}
          </select>

          {activeSession.status !== SessionStatus.LIVE && (
            <button
              type="button"
              onClick={() =>
                onUpdateSessionSettings(activeSession.id, { status: SessionStatus.LIVE })
              }
              className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-[#059669] hover:bg-[#006948] text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
            >
              <Radio className="w-4 h-4" />
              <span>Activate Live Check-In</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Projector Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Elevated QR Token Display Card */}
        <section className="lg:col-span-7 surface-level-2 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#3d4a42] mb-1">
                <span className="font-mono-tabular text-[#0051d5]">
                  {activeSession.cohortCode}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeSession.room}</span>
                <span aria-hidden="true">·</span>
                <span>{activeSession.instructor}</span>
              </div>
              <h2 className="text-xl font-bold text-[#131b2e]">{activeSession.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <SessionStatusBadge status={activeSession.status} />
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                title="Fullscreen classroom display"
                aria-label="Fullscreen classroom display"
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#131b2e] transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center QR Code Matrix + Countdown Ring */}
          <div className="py-7 flex flex-col items-center">
            <div className="relative p-5 rounded-3xl bg-white border-2 border-slate-900/10 shadow-sm">
              <QrMatrix value={qrPayload} size={248} />
            </div>

            {/* Token Readout + Dynamic Countdown Ring */}
            <div className="mt-6 w-full max-w-md flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl bg-[#f8fafc] border border-slate-200/80">
              <div className="min-w-0">
                <div className="text-[11px] font-bold tracking-[0.04em] uppercase text-[#6d7a72]">
                  Active Verification Token
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono-tabular text-base sm:text-lg font-bold text-[#0f172a] truncate">
                    {currentToken}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    aria-label="Copy active token"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-200/70 text-[#334155] transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-[#059669]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic SVG Countdown Ring */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="5"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      fill="none"
                      stroke={secondsRemaining <= 5 ? '#d97706' : '#059669'}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <span className="absolute font-mono-tabular text-xs font-bold text-[#131b2e]">
                    {secondsRemaining}s
                  </span>
                </div>
              </div>
            </div>

            {/* Rotation & Interval Controls */}
            <div className="mt-5 w-full max-w-md flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 bg-[#eaedff] rounded-xl">
                {[15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onChangeInterval(sec)}
                    className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-semibold font-mono-tabular cursor-pointer transition-all ${
                      rotationInterval === sec
                        ? 'bg-white text-[#131b2e] shadow-sm'
                        : 'text-[#3d4a42] hover:text-[#131b2e]'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4999] text-xs font-semibold hover:bg-[#dbeafe] transition-colors cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  type="button"
                  onClick={onRotateNow}
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#059669] hover:bg-[#006948] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rotate Now</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Security Parameters & Live Arrival Feed */}
        <aside className="lg:col-span-5 space-y-5">
          {/* Geofence & Grace Controls */}
          <div className="surface-level-1 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-[#131b2e]">
              Classroom Verification Rules
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#3d4a42] mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Geofence Radius</span>
                </label>
                <select
                  value={activeSession.geofenceRadiusMeters}
                  onChange={(e) =>
                    onUpdateSessionSettings(activeSession.id, {
                      geofenceRadiusMeters: Number(e.target.value),
                    })
                  }
                  className="institutional-input w-full text-sm font-mono-tabular font-semibold"
                >
                  <option value={25}>25 meters</option>
                  <option value={40}>40 meters</option>
                  <option value={50}>50 meters</option>
                  <option value={100}>100 meters</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#3d4a42] mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#d97706]" />
                  <span>Late Grace Period</span>
                </label>
                <select
                  value={activeSession.gracePeriodMinutes}
                  onChange={(e) =>
                    onUpdateSessionSettings(activeSession.id, {
                      gracePeriodMinutes: Number(e.target.value),
                    })
                  }
                  className="institutional-input w-full text-sm font-mono-tabular font-semibold"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenScanner}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#059669] hover:bg-[#006948] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <ScanLine className="w-4 h-4" />
                <span>Test in Learner Scanner</span>
              </button>
            </div>
          </div>

          {/* Live Check-In Feed & Test Simulator */}
          <div className="surface-level-1 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold text-[#131b2e]">
                Live Check-In Stream
              </h3>
              <span className="text-xs font-mono-tabular font-semibold text-[#3d4a42]">
                {sessionLogs.length} events
              </span>
            </div>

            {/* Quick Verification Test Triggers */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => onSimulateScan('VALID')}
                className="h-9 px-3 rounded-lg bg-[#d1fae5] hover:bg-[#a7f3d0] text-[#065f46] text-xs font-semibold cursor-pointer transition-colors"
              >
                + Valid Scan
              </button>
              <button
                type="button"
                onClick={() => onSimulateScan('LATE')}
                className="h-9 px-3 rounded-lg bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] text-xs font-semibold cursor-pointer transition-colors"
              >
                + Late Scan
              </button>
              <button
                type="button"
                onClick={() => onSimulateScan('OUT_OF_BOUNDS')}
                className="h-9 px-3 rounded-lg bg-[#ffe4e6] hover:bg-[#fecdd3] text-[#9f1239] text-xs font-semibold cursor-pointer transition-colors"
              >
                + Geofence Deny
              </button>
            </div>

            {sessionLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#6d7a72]">
                Waiting for learners to scan the rotating QR code...
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {sessionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl bg-[#f8fafc] border border-slate-200/70 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {log.outcome === 'VERIFIED' && (
                        <ShieldCheck className="w-4 h-4 text-[#059669] mt-0.5 shrink-0" />
                      )}
                      {log.outcome === 'LATE' && (
                        <AlertTriangle className="w-4 h-4 text-[#d97706] mt-0.5 shrink-0" />
                      )}
                      {log.outcome === 'DENIED' && (
                        <XCircle className="w-4 h-4 text-[#e11d48] mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#131b2e] truncate">
                          {log.learnerName}
                        </div>
                        <div className="text-xs text-[#3d4a42] truncate">
                          {log.reason}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[#6d7a72] mt-1">
                          {log.nationalId} · {log.distanceMeters}m GPS
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono-tabular font-semibold text-[#3d4a42] shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
