import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  KeyRound,
  ScanLine,
  UserCheck,
  Upload,
  Sparkles,
  ArrowRight,
  ClipboardList,
  GraduationCap,
  MapPin,
} from 'lucide-react';
import jsQR from 'jsqr';
import {
  AttendanceStatus,
  ClassSession,
  CheckInMethod,
  Learner,
  VerificationResult,
} from '../types/attendance';
import { QrMatrix } from './QrMatrix';
import { parseQrData } from '../data/qrParser';
import type { AuthUserSession } from './AuthPortalScreen';

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
  onGoToRoster?: () => void;
  currentUser?: AuthUserSession | null;
  onEnrollLearner?: (sessionId: string, learner: Learner) => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  currentToken,
  previousToken,
  onVerifyCheckIn,
  onBackToProjector,
  onGoToRoster,
  currentUser,
  onEnrollLearner,
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
  const [detectedTokenNotice, setDetectedTokenNotice] = useState<string | null>(null);
  const [scanFlash, setScanFlash] = useState<boolean>(false);

  // Study enrollment form state
  const [isEnrollOpen, setIsEnrollOpen] = useState<boolean>(false);
  const [enrollSessionId, setEnrollSessionId] = useState<string>(activeSession.id);
  const [enrollName, setEnrollName] = useState<string>(currentUser?.name ?? '');
  const [enrollDoc, setEnrollDoc] = useState<string>(currentUser?.nationalId ?? '');
  const [enrollNotice, setEnrollNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      const currentUserName = (currentUser.name || '').trim().toLowerCase();
      const matched = activeSession.learners.find(
        (l) =>
          l.id === currentUser.id ||
          (currentUserName && l.fullName.toLowerCase() === currentUserName)
      );
      if (matched) {
        setSelectedLearnerId(matched.id);
        return;
      }
    }
    const exists = activeSession.learners.some((l) => l.id === selectedLearnerId);
    if (!exists && activeSession.learners.length > 0) {
      setSelectedLearnerId(activeSession.learners[0].id);
    }
  }, [activeSession, selectedLearnerId, currentUser]);

  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        window.cancelAnimationFrame(animFrameIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const syncWithPythonBackend = useCallback(
    (res: VerificationResult, tokenUsed: string, method: CheckInMethod, targetSession: ClassSession) => {
      const learner = targetSession.learners.find((l) => l.id === selectedLearnerId);
      fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: targetSession.id,
          cohort_code: targetSession.cohortCode,
          learner_id: learner?.id ?? selectedLearnerId,
          learner_name: learner?.fullName ?? 'Aprendiz',
          national_id: learner?.nationalId ?? '—',
          token_used: tokenUsed,
          method,
          distance_meters: distanceMeters,
          status: res.outcome === 'VERIFIED' ? 'PRESENT' : res.outcome === 'LATE' ? 'LATE' : 'DENIED',
        }),
      }).catch(() => {
        // Graceful offline fallback
      });
    },
    [distanceMeters, selectedLearnerId]
  );

  const handleDecodedString = useCallback(
    (raw: string) => {
      const now = Date.now();
      if (now - lastScanTimeRef.current < 2500) return;
      lastScanTimeRef.current = now;

      const parsed = parseQrData(raw);
      if (!parsed.token) return;

      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 800);
      setDetectedTokenNotice(`QR Detectado: ${parsed.token}`);

      let targetSession = activeSession;
      if (parsed.sessionId && parsed.sessionId !== activeSession.id) {
        const match = sessions.find((s) => s.id === parsed.sessionId);
        if (match) {
          targetSession = match;
          onSelectSession(match.id);
        }
      }

      if (!selectedLearnerId) return;

      const res = onVerifyCheckIn({
        sessionId: targetSession.id,
        learnerId: selectedLearnerId,
        tokenInput: parsed.token,
        method: CheckInMethod.DYNAMIC_QR,
        distanceMeters,
        simulateLate,
      });
      setLastResult(res);
      syncWithPythonBackend(res, parsed.token, CheckInMethod.DYNAMIC_QR, targetSession);
    },
    [activeSession, distanceMeters, onSelectSession, onVerifyCheckIn, selectedLearnerId, sessions, simulateLate, syncWithPythonBackend]
  );

  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = window.requestAnimationFrame(scanVideoFrame);
      return;
    }

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          handleDecodedString(code.data);
        }
      } catch {
        // Ignored frame read error
      }
    }

    animFrameIdRef.current = window.requestAnimationFrame(scanVideoFrame);
  }, [handleDecodedString]);

  // Attach stream once <video> is mounted in the DOM
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = streamRef.current;
    let cancelled = false;

    const startScanning = () => {
      if (cancelled) return;
      if (animFrameIdRef.current) {
        window.cancelAnimationFrame(animFrameIdRef.current);
      }
      animFrameIdRef.current = window.requestAnimationFrame(scanVideoFrame);
    };

    video
      .play()
      .then(startScanning)
      .catch(() => {
        // Fallback: wait for loadedmetadata if play() needed metadata first
        video.onloadedmetadata = () => {
          video.play().then(startScanning).catch(() => {});
        };
      });

    return () => {
      cancelled = true;
      if (animFrameIdRef.current) {
        window.cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [cameraActive, scanVideoFrame]);

  const toggleCamera = async () => {
    if (cameraActive) {
      if (animFrameIdRef.current) {
        window.cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setCameraError(null);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        window.isSecureContext
          ? 'Tu navegador no soporta acceso a cámara en vivo. Usa "Subir Foto" para escanear.'
          : 'Por seguridad del navegador, la cámara en vivo solo funciona en http://localhost:3000/ o HTTPS. En red local usa "Subir Foto" (toma foto directa).'
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (firstErr) {
        if (firstErr instanceof DOMException && firstErr.name === 'NotAllowedError') {
          throw firstErr;
        }
        // Fallback for webcams/devices that reject environment/resolution constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setCameraError(null);
      setCameraActive(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('Permiso de cámara denegado. Habilita el permiso en tu navegador o usa "Subir Foto".');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('No se detectó ninguna cámara conectada en este dispositivo. Usa "Subir Foto".');
      } else if (name === 'NotReadableError') {
        setCameraError('La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.');
      } else {
        setCameraError('No se pudo iniciar la cámara. Usa "Subir Foto" o simulación óptica.');
      }
      setCameraActive(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleDecodedString(code.data);
        } else {
          setCameraError('No se encontró ningún código QR válido en la imagen.');
          setTimeout(() => setCameraError(null), 4000);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
    syncWithPythonBackend(res, currentToken, CheckInMethod.DYNAMIC_QR, activeSession);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLearnerId || !manualToken.trim()) return;
    const token = manualToken.trim().toUpperCase();
    const res = onVerifyCheckIn({
      sessionId: activeSession.id,
      learnerId: selectedLearnerId,
      tokenInput: token,
      method: CheckInMethod.MANUAL_TOKEN,
      distanceMeters,
      simulateLate,
    });
    setLastResult(res);
    syncWithPythonBackend(res, token, CheckInMethod.MANUAL_TOKEN, activeSession);
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
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleImageUpload}
        className="hidden"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            Lectura Óptica en Vivo & Registro Automático
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            Escáner de Asistencia QR
          </h1>
        </div>

        <select
          aria-label="Sesión de clase objetivo"
          value={activeSession.id}
          onChange={(e) => onSelectSession(e.target.value)}
          className="modern-input text-sm font-semibold min-w-[250px]"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
              {s.cohortCode} — {s.room}
            </option>
          ))}
        </select>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Viewfinder */}
        <section className="lg:col-span-6 rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl relative flex flex-col justify-between min-h-[530px]">
          <div className="absolute inset-0 overflow-hidden">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center">
                <div className="opacity-15 scale-90 pointer-events-none select-none">
                  <QrMatrix value={currentToken} size={220} className="rounded-2xl p-2" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-slate-950/35 pointer-events-none" />
          </div>

          {/* Top Bar */}
          <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between gap-2 bg-slate-950/75 backdrop-blur-md border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  withinGeofence ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="font-mono-tabular text-slate-200">
                {distanceMeters}m / {activeSession.geofenceRadiusMeters}m límite
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Subir Foto</span>
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  cameraActive
                    ? 'bg-rose-500/20 border border-rose-400/40 text-rose-300 hover:bg-rose-500/30'
                    : 'bg-brand-600 hover:bg-brand-700 text-slate-950'
                }`}
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Apagar Cámara</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Prender Cámara</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Centered Optical Target */}
          <div className="relative z-10 flex flex-col items-center justify-center my-6 px-4">
            <div
              className={`relative w-[260px] h-[260px] rounded-2xl flex items-center justify-center transition-all duration-300 ${
                scanFlash
                  ? 'bg-emerald-500/20 ring-4 ring-emerald-400'
                  : 'bg-slate-950/20 border border-white/15'
              }`}
            >
              <span className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-2xl" />
              <span className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-2xl" />
              <span className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-2xl" />
              <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-2xl" />

              <div className="absolute top-0 left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#317252] animate-scan-beam" />

              <div className="text-center px-4">
                <p className="text-xs font-bold text-emerald-300">
                  {cameraActive ? 'Apunta la cámara al QR' : 'Alinea el QR del Aula'}
                </p>
                <p className="text-[11px] font-mono-tabular text-slate-300 mt-1">
                  {activeSession.cohortCode} · {activeSession.room}
                </p>
                {cameraActive && (
                  <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <Sparkles className="w-2.5 h-2.5" />
                    Escaneo Activo
                  </span>
                )}
              </div>
            </div>

            {detectedTokenNotice && (
              <p className="mt-3 text-xs font-mono-tabular font-semibold text-emerald-300 bg-slate-900/90 border border-emerald-500/40 rounded-xl px-3.5 py-1.5">
                {detectedTokenNotice}
              </p>
            )}

            {cameraError && (
              <p className="mt-3 text-xs text-amber-200 bg-amber-950/80 border border-amber-500/40 rounded-xl px-3.5 py-2 max-w-xs text-center">
                {cameraError}
              </p>
            )}
          </div>

          {/* Bottom Readout Shelf */}
          <div className="relative z-10 p-4 sm:p-5 bg-slate-950/85 backdrop-blur-md border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-400">
                  Aprendiz Seleccionado
                </div>
                <div className="text-sm font-bold text-slate-100 truncate">
                  {selectedLearner?.fullName ?? 'Seleccionar Aprendiz'}
                </div>
              </div>
              <span className="text-xs font-mono-tabular text-cyan-300 shrink-0">
                {selectedLearner?.nationalId}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpticalScan}
              className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Registrar Escaneo Ahora ({currentToken})</span>
            </button>
          </div>
        </section>

        {/* Right: Result Banner + Controls */}
        <div className="lg:col-span-6 space-y-5">
          {lastResult && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-2xl p-5 border shadow-xl animate-fade-in ${
                lastResult.outcome === 'VERIFIED'
                  ? 'bg-emerald-950/60 border-emerald-400/50 text-emerald-100'
                  : lastResult.outcome === 'LATE'
                  ? 'bg-amber-950/60 border-amber-400/50 text-amber-100'
                  : 'bg-rose-950/60 border-rose-400/50 text-rose-100'
              }`}
            >
              <div className="flex items-start gap-3">
                {lastResult.outcome === 'VERIFIED' && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {lastResult.outcome === 'LATE' && (
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                )}
                {lastResult.outcome === 'DENIED' && (
                  <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-100">{lastResult.title}</h2>
                    <span className="text-xs font-mono-tabular font-semibold opacity-80">
                      {lastResult.timestamp}
                    </span>
                  </div>
                  <p className="text-sm mt-1 leading-snug opacity-90">{lastResult.detail}</p>
                  <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono-tabular opacity-80">
                    {lastResult.learnerName && <span>{lastResult.learnerName}</span>}
                    {lastResult.distanceMeters !== undefined && (
                      <span>GPS: {lastResult.distanceMeters}m</span>
                    )}
                    {lastResult.signature && <span>Hash: {lastResult.signature}</span>}
                  </div>

                  {lastResult.outcome !== 'DENIED' && onGoToRoster && (
                    <button
                      type="button"
                      onClick={onGoToRoster}
                      className="mt-4 w-full h-10 rounded-xl bg-white text-slate-100 hover:bg-brand-50 font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>Ir al Registro de Asistencia (Ver Listado)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parameters */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100">
                Identidad y Verificación de Ubicación
              </h3>
              <button
                type="button"
                onClick={onBackToProjector}
                className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer"
              >
                Ver Proyector QR
              </button>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aprendiz que Registra</span>
              </label>
              <select
                value={selectedLearnerId}
                onChange={(e) => setSelectedLearnerId(e.target.value)}
                className="modern-input w-full text-sm font-medium"
              >
                {activeSession.learners.map((l) => (
                  <option key={l.id} value={l.id} className="bg-slate-900">
                    {l.fullName} ({l.nationalId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-400">
                  Distancia GPS simulada ({activeSession.room})
                </span>
                <span
                  className={`font-mono-tabular ${
                    withinGeofence ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {distanceMeters}m ({withinGeofence ? 'Dentro de Geocerca' : 'Fuera de Rango'})
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={160}
                value={distanceMeters}
                onChange={(e) => setDistanceMeters(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono-tabular text-slate-500 mt-1">
                <span>5m (En aula)</span>
                <span>{activeSession.geofenceRadiusMeters}m límite</span>
                <span>160m (Fuera de sede)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateLate}
                  onChange={(e) => setSimulateLate(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <span>Simular tardanza ({activeSession.gracePeriodMinutes}m gracia)</span>
              </label>

              <button
                type="button"
                onClick={handleTestExpiredToken}
                className="text-xs font-semibold text-rose-400 hover:underline cursor-pointer"
              >
                Probar QR Expirado
              </button>
            </div>
          </div>

          {/* Manual Token Fallback */}
          <form onSubmit={handleManualSubmit} className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">Ingreso Manual de Token</h3>
            </div>
            <p className="text-xs text-slate-400">
              Si la cámara no enfoca, escribe el código rotativo mostrado debajo del QR.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder={`Ej. ${currentToken}`}
                aria-label="Token manual de asistencia"
                className="modern-input flex-1 text-sm font-mono-tabular uppercase"
              />
              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Verificar Token
              </button>
            </div>
          </form>

          {/* Study Campus & Program Enrollment + Personal Attendance Tracking */}
          {onEnrollLearner && (
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Inscripción y Seguimiento de Estudio
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEnrollOpen((o) => !o);
                    setEnrollNotice(null);
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
                >
                  {isEnrollOpen ? 'Ocultar formulario' : '+ Inscribirme en otra sede'}
                </button>
              </div>

              {enrollNotice && (
                <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-2.5 text-xs font-medium text-emerald-200">
                  {enrollNotice}
                </div>
              )}

              {isEnrollOpen && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const finalName = (enrollName || currentUser?.name || '').trim();
                    const finalDoc = (
                      enrollDoc ||
                      currentUser?.nationalId ||
                      `CC ${Math.floor(1000000000 + Math.random() * 89999999)}`
                    ).trim();
                    if (!finalName) return;

                    const target = sessions.find((s) => s.id === enrollSessionId) ?? activeSession;
                    const already = target.learners.find(
                      (l) =>
                        l.fullName.toLowerCase() === finalName.toLowerCase() ||
                        l.nationalId.toLowerCase() === finalDoc.toLowerCase()
                    );

                    if (already) {
                      onSelectSession(target.id);
                      setSelectedLearnerId(already.id);
                      setEnrollNotice(
                        `Ya estabas inscrito en ${target.cohortCode} (${target.campus} · ${target.room}).`
                      );
                      setIsEnrollOpen(false);
                      return;
                    }

                    const newLearner: Learner = {
                      id: currentUser?.id ?? `lrn-${Date.now().toString().slice(-5)}`,
                      fullName: finalName,
                      nationalId: finalDoc,
                      program: target.title,
                      avatarColor: 'bg-emerald-500',
                    };

                    onEnrollLearner(target.id, newLearner);
                    onSelectSession(target.id);
                    setSelectedLearnerId(newLearner.id);
                    setEnrollNotice(
                      `Inscrito en ${target.title} (${target.campus} · ${target.room}). ¡Ya puedes registrar asistencia con QR!`
                    );
                    setIsEnrollOpen(false);
                  }}
                  className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-xl p-4"
                >
                  <div className="space-y-1">
                    <label htmlFor="enroll-session" className="block text-xs font-semibold text-slate-300">
                      ¿Dónde vas a estudiar? (Programa y Sede)
                    </label>
                    <select
                      id="enroll-session"
                      value={enrollSessionId}
                      onChange={(e) => setEnrollSessionId(e.target.value)}
                      className="modern-input w-full text-xs font-medium"
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900">
                          {s.cohortCode} · {s.title} — {s.campus} ({s.room})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="enroll-name" className="block text-xs font-semibold text-slate-300">
                        Nombre completo
                      </label>
                      <input
                        id="enroll-name"
                        type="text"
                        required
                        value={enrollName}
                        onChange={(e) => setEnrollName(e.target.value)}
                        placeholder="Ej. Valeria Gómez"
                        className="modern-input w-full text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="enroll-doc" className="block text-xs font-semibold text-slate-300">
                        Documento
                      </label>
                      <input
                        id="enroll-doc"
                        type="text"
                        required
                        value={enrollDoc}
                        onChange={(e) => setEnrollDoc(e.target.value)}
                        placeholder="CC 1.098.765.432"
                        className="modern-input w-full text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Confirmar Inscripción y Activar QR
                  </button>
                </form>
              )}

              {/* Current Learner Attendance Tracker across Enrolled Sessions */}
              {(() => {
                const activeLearner = activeSession.learners.find((l) => l.id === selectedLearnerId);
                if (!activeLearner) return null;
                const enrolled = sessions.filter((s) =>
                  s.learners.some(
                    (l) =>
                      l.id === activeLearner.id ||
                      l.fullName.toLowerCase() === activeLearner.fullName.toLowerCase()
                  )
                );
                return (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Mis Sedes Inscritas y Asistencia ({activeLearner.fullName})
                    </div>
                    <div className="space-y-2">
                      {enrolled.map((ses) => {
                        const lrn = ses.learners.find(
                          (l) =>
                            l.id === activeLearner.id ||
                            l.fullName.toLowerCase() === activeLearner.fullName.toLowerCase()
                        );
                        const rec = ses.records.find((r) => r.learnerId === lrn?.id);
                        const st = rec?.status ?? AttendanceStatus.ABSENT;
                        return (
                          <div
                            key={ses.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/70 border border-slate-800 px-3.5 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-100 truncate">
                                {ses.cohortCode} · {ses.title}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span className="truncate">
                                  {ses.campus} · {ses.room}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                st === AttendanceStatus.PRESENT
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : st === AttendanceStatus.LATE
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {st === AttendanceStatus.PRESENT
                                ? `Presente (${rec?.checkedInAt ?? ''})`
                                : st === AttendanceStatus.LATE
                                ? `Tardanza (${rec?.checkedInAt ?? ''})`
                                : 'Pendiente QR'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
