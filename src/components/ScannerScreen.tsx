import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  KeyRound,
  ScanLine,
  UserCheck,
} from 'lucide-react';
import {
  ClassSession,
  CheckInMethod,
  VerificationResult,
} from '../types/attendance';
import { QrMatrix } from './QrMatrix';

interface ScannerScreenProps {
  sessions: ClassSession[];
  activeSession: ClassSession;
  onSelectSession: (sessionId: string) => void;
  currentToken: string;
  previousToken: string;
  onVerifyCheckIn: (params: {
    sessionId: string;
    learnerId: string;
    tokenInput: string;
    method: CheckInMethod;
    distanceMeters: number;
    simulateLate: boolean;
  }) => VerificationResult;
  onBackToProjector: () => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  currentToken,
  previousToken,
  onVerifyCheckIn,
  onBackToProjector,
}) => {
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(
    activeSession.learners[0]?.id ?? ''
  );
  const [distanceMeters, setDistanceMeters] = useState<number>(22);
  const [simulateLate, setSimulateLate] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync selected learner when session changes
  useEffect(() => {
    const exists = activeSession.learners.some((l) => l.id === selectedLearnerId);
    if (!exists && activeSession.learners.length > 0) {
      setSelectedLearnerId(activeSession.learners[0].id);
    }
  }, [activeSession, selectedLearnerId]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleCamera = async () => {
    if (cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setCameraError(null);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API unavailable in this browser context. Use simulated QR capture or manual token entry.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setCameraError(null);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraError('Camera permission denied or no camera detected. Classroom optical simulation remains active.');
      setCameraActive(false);
    }
  };

  const handleOpticalScan = () => {
    if (!selectedLearnerId) return;
    const res = onVerifyCheckIn({
      sessionId: activeSession.id,
      learnerId: selectedLearnerId,
      tokenInput: currentToken,
      method: CheckInMethod.DYNAMIC_QR,
      distanceMeters,
      simulateLate,
    });
    setLastResult(res);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLearnerId || !manualToken.trim()) return;
    const res = onVerifyCheckIn({
      sessionId: activeSession.id,
      learnerId: selectedLearnerId,
      tokenInput: manualToken.trim().toUpperCase(),
      method: CheckInMethod.MANUAL_TOKEN,
      distanceMeters,
      simulateLate,
    });
    setLastResult(res);
  };

  const handleTestExpiredToken = () => {
    if (!selectedLearnerId) return;
    const expiredSample = previousToken || 'ACQR-0000-EXPIRED';
    const res = onVerifyCheckIn({
      sessionId: activeSession.id,
      learnerId: selectedLearnerId,
      tokenInput: expiredSample === currentToken ? 'ACQR-9999-EXPIRED' : expiredSample,
      method: CheckInMethod.DYNAMIC_QR,
      distanceMeters,
      simulateLate: false,
    });
    setLastResult(res);
  };

  const selectedLearner = activeSession.learners.find((l) => l.id === selectedLearnerId);
  const withinGeofence = distanceMeters <= activeSession.geofenceRadiusMeters;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#006948] tracking-wide mb-1">
            Learner Mobile Check-In Viewfinder
          </p>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#131b2e] leading-tight">
            QR Attendance Scanner
          </h1>
        </div>

        <select
          aria-label="Target classroom session"
          value={activeSession.id}
          onChange={(e) => onSelectSession(e.target.value)}
          className="institutional-input text-sm font-semibold text-[#131b2e] min-w-[250px]"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.cohortCode} — {s.room}
            </option>
          ))}
        </select>
      </div>

      {/* Main Split: Edge-to-Edge Viewfinder + Controls & Receipt */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Edge-to-Edge Dark Scanner Viewfinder */}
        <section className="lg:col-span-6 rounded-3xl overflow-hidden bg-[#0f172a] text-white surface-level-2 relative flex flex-col justify-between min-h-[520px]">
          {/* Live Camera or Simulated Optical Classroom Target */}
          <div className="absolute inset-0 overflow-hidden">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-slate-900 via-[#0f172a] to-slate-950 flex items-center justify-center">
                {/* Subtle simulated classroom projector target in the background */}
                <div className="opacity-20 scale-90 pointer-events-none select-none">
                  <QrMatrix value={currentToken} size={210} className="rounded-xl p-2" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-slate-950/35" />
          </div>

          {/* Top Viewfinder Bar */}
          <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="glass-dark rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold">
              <MapPin
                className={`w-3.5 h-3.5 ${
                  withinGeofence ? 'text-[#10b981]' : 'text-[#fb7185]'
                }`}
              />
              <span className="font-mono-tabular">
                {distanceMeters}m / {activeSession.geofenceRadiusMeters}m limit
              </span>
            </div>

            <button
              type="button"
              onClick={toggleCamera}
              className="glass-dark hover:bg-slate-800/90 rounded-full h-10 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              {cameraActive ? (
                <>
                  <CameraOff className="w-3.5 h-3.5 text-rose-300" />
                  <span>Stop Camera</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Use Device Camera</span>
                </>
              )}
            </button>
          </div>

          {/* Centered 260x260px Cut-Out Target with 3px Rounded Emerald Guide Corners */}
          <div className="relative z-10 flex flex-col items-center justify-center my-4 px-4">
            <div className="relative w-[260px] h-[260px] rounded-2xl flex items-center justify-center">
              {/* 4 Rounded Emerald Guide Corners (3px) */}
              <span className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-[#10b981] rounded-tl-2xl" />
              <span className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-[#10b981] rounded-tr-2xl" />
              <span className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-[#10b981] rounded-bl-2xl" />
              <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-[#10b981] rounded-br-2xl" />

              {/* Animated Emerald Scan Beam */}
              <div className="absolute top-0 left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-[#10b981] to-transparent shadow-[0_0_12px_#10b981] animate-scan-beam" />

              <div className="text-center px-4">
                <p className="text-xs font-semibold text-emerald-300 tracking-wide">
                  Align Classroom QR
                </p>
                <p className="text-[11px] text-slate-300 mt-1 font-mono-tabular">
                  {activeSession.cohortCode} · {activeSession.room}
                </p>
              </div>
            </div>

            {cameraError && (
              <p className="mt-3 text-xs text-amber-200 bg-amber-950/70 border border-amber-500/30 rounded-xl px-3 py-2 max-w-xs text-center">
                {cameraError}
              </p>
            )}
          </div>

          {/* Glassmorphic Bottom Readout Shelf */}
          <div className="relative z-10 p-4 sm:p-5">
            <div className="glass-dark rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Active Learner Profile
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {selectedLearner?.fullName ?? 'Select Learner'}
                  </div>
                </div>
                <span className="text-xs font-mono-tabular text-emerald-300 shrink-0">
                  {selectedLearner?.nationalId}
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpticalScan}
                className="w-full h-[52px] rounded-2xl bg-[#059669] hover:bg-[#10b981] active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <ScanLine className="w-5 h-5" />
                <span>Scan Classroom QR ({currentToken})</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right: Learner Identity, GPS Simulator, Manual Token & Result Card */}
        <div className="lg:col-span-6 space-y-5">
          {/* Verification Result Feedback Banner */}
          {lastResult && (
            <div
              role="status"
              className={`rounded-2xl p-5 border ${
                lastResult.outcome === 'VERIFIED'
                  ? 'bg-[#d1fae5] border-[#6ee7b7] text-[#065f46]'
                  : lastResult.outcome === 'LATE'
                  ? 'bg-[#fef3c7] border-[#fcd34d] text-[#92400e]'
                  : 'bg-[#ffe4e6] border-[#fda4af] text-[#9f1239]'
              }`}
            >
              <div className="flex items-start gap-3">
                {lastResult.outcome === 'VERIFIED' && (
                  <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
                )}
                {lastResult.outcome === 'LATE' && (
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                )}
                {lastResult.outcome === 'DENIED' && (
                  <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold">{lastResult.title}</h2>
                    <span className="text-xs font-mono-tabular font-bold">
                      {lastResult.timestamp}
                    </span>
                  </div>
                  <p className="text-sm mt-1 leading-snug">{lastResult.detail}</p>
                  <div className="mt-3 pt-2.5 border-t border-current/15 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono-tabular">
                    {lastResult.learnerName && <span>{lastResult.learnerName}</span>}
                    {lastResult.distanceMeters !== undefined && (
                      <span>GPS: {lastResult.distanceMeters}m</span>
                    )}
                    {lastResult.signature && <span>Hash: {lastResult.signature}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Learner & Geofence Test Parameters */}
          <div className="surface-level-1 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#131b2e]">
                Check-In Identity &amp; Location Check
              </h3>
              <button
                type="button"
                onClick={onBackToProjector}
                className="text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer"
              >
                View Live Projector
              </button>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#3d4a42] mb-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#059669]" />
                <span>Select Learner Checking In</span>
              </label>
              <select
                value={selectedLearnerId}
                onChange={(e) => setSelectedLearnerId(e.target.value)}
                className="institutional-input w-full text-sm font-medium text-[#131b2e]"
              >
                {activeSession.learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName} ({l.nationalId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-[#3d4a42]">
                  Simulated GPS Distance from {activeSession.room}
                </span>
                <span
                  className={`font-mono-tabular ${
                    withinGeofence ? 'text-[#006948]' : 'text-[#ba1a1a]'
                  }`}
                >
                  {distanceMeters}m ({withinGeofence ? 'Inside Geofence' : 'Out of Bounds'})
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={160}
                value={distanceMeters}
                onChange={(e) => setDistanceMeters(Number(e.target.value))}
                className="w-full accent-[#059669] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono-tabular text-[#6d7a72] mt-1">
                <span>5m (At Desk)</span>
                <span>{activeSession.geofenceRadiusMeters}m Limit</span>
                <span>160m (Off-Site)</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-[#131b2e] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateLate}
                  onChange={(e) => setSimulateLate(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#d97706]"
                />
                <span>Simulate check-in after {activeSession.gracePeriodMinutes}m grace period</span>
              </label>

              <button
                type="button"
                onClick={handleTestExpiredToken}
                className="text-xs font-semibold text-[#ba1a1a] hover:underline cursor-pointer whitespace-nowrap"
              >
                Test Expired QR
              </button>
            </div>
          </div>

          {/* Manual Token Fallback Input */}
          <form
            onSubmit={handleManualSubmit}
            className="surface-level-1 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#0051d5]" />
              <h3 className="text-base font-semibold text-[#131b2e]">
                Manual Token Fallback
              </h3>
            </div>
            <p className="text-xs text-[#3d4a42]">
              If a learner&apos;s camera cannot focus in low classroom lighting, enter the rotating token code displayed below the projector QR.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder={`Enter token e.g. ${currentToken}`}
                aria-label="Manual attendance token"
                className="institutional-input flex-1 text-sm font-mono-tabular uppercase"
              />
              <button
                type="submit"
                className="h-12 px-5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4999] hover:bg-[#dbeafe] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Verify Token
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
