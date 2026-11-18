import React, { useEffect, useState } from 'react';
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
  Radio,
  Globe,
  FileCode2,
  Download,
  Palette,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import {
  ClassSession,
  ScanEventLog,
  SessionStatus,
} from '../types/attendance';
import { QrMatrix } from './QrMatrix';
import { SessionStatusBadge } from './StatusBadge';

type QrStyle = 'rounded' | 'dots' | 'gapped' | 'square';

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

const COLOR_PRESETS = [
  { name: 'Esmeralda', fg: '#065f46', grad: '#0891b2' },
  { name: 'Cobalto', fg: '#1e3a8a', grad: '#0284c7' },
  { name: 'Índigo', fg: '#312e81', grad: '#7c3aed' },
  { name: 'Obsidiana', fg: '#0f172a', grad: '' },
];

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
  const [payloadMode, setPayloadMode] = useState<'URL' | 'JSON'>('URL');

  // Python QR Personalization State
  const [qrStyle, setQrStyle] = useState<QrStyle>('rounded');
  const [fgColor, setFgColor] = useState('#065f46');
  const [gradientColor, setGradientColor] = useState('#0891b2');
  const [badgeText, setBadgeText] = useState('ACADE');
  const [pythonQrImage, setPythonQrImage] = useState<string | null>(null);
  const [pythonLoading, setPythonLoading] = useState(false);
  const [pythonEngineActive, setPythonEngineActive] = useState(false);

  const progressRatio = Math.max(0, Math.min(1, secondsRemaining / rotationInterval));
  const ringRadius = 26;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:3000';

  const qrUrlPayload = `${origin}/?session=${encodeURIComponent(
    activeSession.id
  )}&token=${encodeURIComponent(currentToken)}&cohort=${encodeURIComponent(
    activeSession.cohortCode
  )}`;

  const qrJsonPayload = JSON.stringify({
    v: 1,
    sessionId: activeSession.id,
    cohort: activeSession.cohortCode,
    token: currentToken,
    room: activeSession.room,
  });

  const qrPayload = payloadMode === 'URL' ? qrUrlPayload : qrJsonPayload;

  // Fetch custom styled QR PNG from Python FastAPI (qrcode + Pillow)
  useEffect(() => {
    const controller = new AbortController();
    setPythonLoading(true);

    fetch('/api/qr/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        data: qrPayload,
        style: qrStyle,
        fg_color: fgColor,
        bg_color: '#ffffff',
        gradient_color: gradientColor || null,
        badge_text: badgeText.trim() || null,
        size: 420,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Python QR API error');
        return res.json();
      })
      .then((data) => {
        if (data?.image_base64) {
          setPythonQrImage(data.image_base64);
          setPythonEngineActive(true);
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setPythonEngineActive(false);
          setPythonQrImage(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPythonLoading(false);
        }
      });

    return () => controller.abort();
  }, [qrPayload, qrStyle, fgColor, gradientColor, badgeText]);

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(currentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadPythonQr = () => {
    if (!pythonQrImage) return;
    const link = document.createElement('a');
    link.href = pythonQrImage;
    link.download = `qr_${activeSession.cohortCode.toLowerCase()}_${currentToken}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sessionLogs = scanLogs.filter((l) => l.sessionId === activeSession.id);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#060b14] text-white flex flex-col items-center justify-between p-6 sm:p-10">
        <div className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {activeSession.cohortCode} · {activeSession.room} · {activeSession.instructor}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {activeSession.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" aria-hidden="true" />
            <span>Salir de Pantalla Completa</span>
          </button>
        </div>

        <div className="flex flex-col items-center my-auto">
          <div className="p-6 rounded-3xl bg-white shadow-2xl ring-4 ring-emerald-500/25">
            {pythonQrImage ? (
              <img
                src={pythonQrImage}
                alt={`QR dinámico ${currentToken}`}
                className="w-[320px] h-[320px] object-contain rounded-xl"
              />
            ) : (
              <QrMatrix value={qrPayload} size={320} />
            )}
          </div>
          <div className="mt-6 flex items-center gap-4">
            <span className="font-mono-tabular text-2xl font-bold tracking-wider text-white">
              {currentToken}
            </span>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-1 text-xs font-mono-tabular font-bold text-emerald-300">
              Rotación en {String(secondsRemaining).padStart(2, '0')}s
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 text-center">
          Escanea con la cámara de tu teléfono o el visor AcadeQR dentro de {activeSession.geofenceRadiusMeters}m de {activeSession.room}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Session Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Estudio Python QR (qrcode + Pillow) & Proyección
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Proyector y Generador QR Personalizado
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            aria-label="Seleccionar sesión activa"
            value={activeSession.id}
            onChange={(e) => onSelectSession(e.target.value)}
            className="modern-input text-sm font-semibold min-w-[260px]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
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
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" aria-hidden="true" />
              <span>Activar en Vivo</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Projector Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: QR Token Display Card */}
        <section className="lg:col-span-7 glass-panel-elevated rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <span className="font-mono-tabular text-cyan-400">{activeSession.cohortCode}</span>
                <span aria-hidden="true">·</span>
                <span>{activeSession.room}</span>
                <span aria-hidden="true">·</span>
                <span>{activeSession.instructor}</span>
              </div>
              <h2 className="text-xl font-bold text-white">{activeSession.title}</h2>
            </div>

            <div className="flex items-center gap-2.5">
              <SessionStatusBadge status={activeSession.status} />
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                title="Pantalla completa"
                aria-label="Pantalla completa en aula"
                className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Center QR Display */}
          <div className="flex flex-col items-center">
            {/* Format + Engine Status */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-5">
              <div className="inline-flex rounded-xl bg-slate-900/90 border border-slate-800 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPayloadMode('URL')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    payloadMode === 'URL'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>URL Móvil</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayloadMode('JSON')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    payloadMode === 'JSON'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>JSON Cripto</span>
                </button>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border ${
                  pythonEngineActive
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Cpu className="w-3 h-3" />
                {pythonLoading
                  ? 'Renderizando en Python...'
                  : pythonEngineActive
                  ? 'Renderizado con Python (Pillow)'
                  : 'Respaldo SVG Local'}
              </span>
            </div>

            <div className="relative p-5 rounded-3xl bg-white shadow-2xl ring-4 ring-emerald-500/20">
              {pythonQrImage ? (
                <img
                  src={pythonQrImage}
                  alt={`QR personalizado ${currentToken}`}
                  className="w-[250px] h-[250px] object-contain rounded-xl"
                />
              ) : (
                <QrMatrix value={qrPayload} size={250} />
              )}
            </div>

            {/* Token Readout + Dynamic Countdown Ring */}
            <div className="mt-6 w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Token Activo
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono-tabular text-lg font-bold text-emerald-300 truncate">
                    {currentToken}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    aria-label="Copiar token activo"
                    className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(148,163,184,0.2)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={ringRadius}
                    fill="none"
                    stroke={secondsRemaining <= 5 ? '#f59e0b' : '#10b981'}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                </svg>
                <span className="absolute font-mono-tabular text-xs font-bold text-white">
                  {secondsRemaining}s
                </span>
              </div>
            </div>

            {/* Rotation & Download Controls */}
            <div className="mt-5 w-full max-w-md flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                {[15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onChangeInterval(sec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold cursor-pointer transition-colors ${
                      rotationInterval === sec
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
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
                  className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
                </button>

                <button
                  type="button"
                  onClick={onRotateNow}
                  className="h-9 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rotar</span>
                </button>

                {pythonQrImage && (
                  <button
                    type="button"
                    onClick={handleDownloadPythonQr}
                    title="Descargar PNG generado en Python"
                    className="h-9 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PNG</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right: Python QR Studio + Rules + Live Feed */}
        <aside className="lg:col-span-5 space-y-5">
          {/* Python Personalization Panel */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Personalización QR con Python (Pillow)
                </h3>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Estilo de Módulos
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'rounded', label: 'Redondeado' },
                    { id: 'dots', label: 'Puntos' },
                    { id: 'gapped', label: 'Mosaico' },
                    { id: 'square', label: 'Clásico' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setQrStyle(st.id)}
                    className={`h-9 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      qrStyle === st.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Paleta Institucional
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const active = fgColor === preset.fg && gradientColor === preset.grad;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setFgColor(preset.fg);
                        setGradientColor(preset.grad);
                      }}
                      className={`h-9 px-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-800 border-emerald-400 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: preset.fg }}
                      />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Insignia Central (Texto)
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="Ej. ACADE"
                  className="modern-input w-full text-xs font-mono-tabular uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Color Personalizado
                </label>
                <div className="flex items-center gap-2 h-11 px-3 rounded-xl bg-slate-950/75 border border-slate-700/50">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    aria-label="Color principal del QR"
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono-tabular text-xs text-slate-300 uppercase">
                    {fgColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Geofence & Scanner Link */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Reglas de Verificación en Aula
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Radio Geocerca</span>
                </label>
                <select
                  value={activeSession.geofenceRadiusMeters}
                  onChange={(e) =>
                    onUpdateSessionSettings(activeSession.id, {
                      geofenceRadiusMeters: Number(e.target.value),
                    })
                  }
                  className="modern-input w-full text-xs font-mono-tabular font-semibold"
                >
                  <option value={25} className="bg-slate-900">25 metros</option>
                  <option value={40} className="bg-slate-900">40 metros</option>
                  <option value={50} className="bg-slate-900">50 metros</option>
                  <option value={100} className="bg-slate-900">100 metros</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Margen de Gracia</span>
                </label>
                <select
                  value={activeSession.gracePeriodMinutes}
                  onChange={(e) =>
                    onUpdateSessionSettings(activeSession.id, {
                      gracePeriodMinutes: Number(e.target.value),
                    })
                  }
                  className="modern-input w-full text-xs font-mono-tabular font-semibold"
                >
                  <option value={5} className="bg-slate-900">5 minutos</option>
                  <option value={10} className="bg-slate-900">10 minutos</option>
                  <option value={15} className="bg-slate-900">15 minutos</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenScanner}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Prender Cámara y Probar Escaneo</span>
            </button>
          </div>

          {/* Live Check-In Feed */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-white">Registro en Tiempo Real</h3>
              <span className="text-xs font-mono-tabular text-slate-400">
                {sessionLogs.length} eventos
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => onSimulateScan('VALID')}
                className="h-8 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer"
              >
                + Válido
              </button>
              <button
                type="button"
                onClick={() => onSimulateScan('LATE')}
                className="h-8 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer"
              >
                + Tardanza
              </button>
              <button
                type="button"
                onClick={() => onSimulateScan('OUT_OF_BOUNDS')}
                className="h-8 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer"
              >
                + Fuera Geocerca
              </button>
            </div>

            {sessionLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Esperando lecturas de aprendices en aula...
              </p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {sessionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {log.outcome === 'VERIFIED' && (
                        <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      )}
                      {log.outcome === 'LATE' && (
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      )}
                      {log.outcome === 'DENIED' && (
                        <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {log.learnerName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{log.reason}</div>
                        <div className="text-[10px] font-mono-tabular text-slate-500 mt-0.5">
                          {log.nationalId} · {log.distanceMeters}m GPS
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
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
