import { useState, useEffect } from 'react';
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  IdCard,
  QrCode,
  ScanLine,
  Zap,
  ShieldCheck,
  Cpu,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { QrMatrix } from './QrMatrix';
import { ThreeBackground } from './ThreeBackground';

interface LandingPageProps {
  name: string;
  isStudent: boolean;
  onOpenProjector: () => void;
  onOpenScanner: () => void;
  onOpenOverview: () => void;
  onOpenStudentCard: () => void;
  liveSession?: { title: string; room: string; token: string };
}

export function LandingPage({
  name,
  isStudent,
  onOpenProjector,
  onOpenScanner,
  onOpenOverview,
  onOpenStudentCard,
  liveSession,
}: LandingPageProps) {
  const [pulseSeconds, setPulseSeconds] = useState(25);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseSeconds((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentToken = liveSession?.token || 'ACADEQR:COH-2841:TK-882194:SEC-104';

  const handleCopyToken = () => {
    navigator.clipboard?.writeText(currentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const featureCards = [
    {
      icon: ScanLine,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
      badge: 'Geolocalización GPS',
      title: 'Escaneo Inteligente HUD',
      description: 'Verificación instantánea de código QR con radar de proximidad y validación de geocerca en metros.',
      onClick: onOpenScanner,
      buttonText: 'Abrir Escáner Láser',
    },
    {
      icon: isStudent ? IdCard : QrCode,
      color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30',
      badge: isStudent ? 'Credencial Móvil' : 'Proyección Criptográfica',
      title: isStudent ? 'Carnet Digital con QR' : 'Proyector Dinámico en Vivo',
      description: isStudent
        ? 'Identificación institucional con código QR individual y diseño de carnet holográfico.'
        : 'Tokens rotativos automáticos cada 20-30 segundos para evitar fraudes por captura de pantalla.',
      onClick: isStudent ? onOpenStudentCard : onOpenProjector,
      buttonText: isStudent ? 'Ver mi Carnet' : 'Lanzar Proyector',
    },
    {
      icon: isStudent ? ClipboardList : CalendarDays,
      color: 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30',
      badge: 'Tiempo Real',
      title: isStudent ? 'Historial & Puntualidad' : 'Sesiones de Clase & Cohortes',
      description: isStudent
        ? 'Consulta tus métricas de asistencia, registros de puntualidad, tardanzas y justificaciones.'
        : 'Supervisión en vivo de cohortes, listados de aprendices y exportación oficial en CSV.',
      onClick: onOpenOverview,
      buttonText: isStudent ? 'Mi Historial' : 'Ver Sesiones',
    },
    {
      icon: Cpu,
      color: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30',
      badge: 'Telemetría & Auditoría',
      title: 'Motor Python + MySQL',
      description: 'API RESTful nativa en FastAPI con autenticación JWT, cifrado Bcrypt y almacenamiento en MySQL XAMPP.',
      onClick: onOpenOverview,
      buttonText: 'Ver Métricas',
    },
  ];

  return (
    <div className="space-y-12">
      {/* ============================================================== */}
      {/* HERO SECTION ULTRA-MODERNA CON THREE.JS Y CRISTAL HOLOGRÁFICO */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 sm:p-12 xl:p-16 backdrop-blur-2xl shadow-2xl shadow-emerald-950/20">
        {/* Fondo interactivo 3D con Three.js */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <ThreeBackground intensity="hero" />
        </div>

        {/* Gradientes ambientales */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.3fr_1fr] items-center">
          {/* Lado Izquierdo: Información y Acciones */}
          <div className="space-y-6">
            {/* Pill de Estado en Vivo */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-inner shadow-emerald-500/20">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <span>SISTEMA EN LÍNEA: PYTHON 3 + MYSQL XAMPP</span>
              <span className="hidden sm:inline-block text-emerald-400/60">•</span>
              <span className="hidden sm:inline-block font-mono text-[11px] text-emerald-200">LATENCIA &lt; 10ms</span>
            </div>

            {/* Título y Saludo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-cyan-400">
                <GraduationCap className="size-4" />
                <span>{isStudent ? 'Portal del Aprendiz' : 'Centro de Control Docente'}</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.08]">
                Hola, <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">{name.trim().split(/\s+/)[0]}</span>
              </h1>
              <p className="max-w-xl text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                {isStudent
                  ? 'Verifica tu presencia en aula en microsegundos mediante escaneo dinámico de código QR de alta seguridad con validación GPS.'
                  : 'Proyecta códigos QR rotativos en alta definición, supervisa la asistencia en vivo y gestiona tus cohortes técnicas en tiempo real.'}
              </p>
            </div>

            {/* Botones de Acción Rápida con Efectos Glow */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={isStudent ? onOpenScanner : onOpenProjector}
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/50 cursor-pointer active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                {isStudent ? <ScanLine className="size-5 transition-transform group-hover:rotate-12" /> : <QrCode className="size-5 transition-transform group-hover:rotate-12" />}
                <span>{isStudent ? 'Abrir Escáner Láser' : 'Iniciar Proyección en Vivo'}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={isStudent ? onOpenStudentCard : onOpenOverview}
                className="inline-flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-sm font-semibold text-slate-200 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:border-white/25 cursor-pointer active:scale-[0.98]"
              >
                {isStudent ? <IdCard className="size-5 text-cyan-400" /> : <CalendarDays className="size-5 text-indigo-400" />}
                <span>{isStudent ? 'Ver mi Carnet Digital' : 'Panel de Sesiones'}</span>
              </button>
            </div>

            {/* Métricas rápidas de confianza */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs text-slate-400">
              <div className="space-y-1">
                <span className="block font-mono text-base font-bold text-emerald-400">99.8%</span>
                <span>Precisión QR</span>
              </div>
              <div className="space-y-1">
                <span className="block font-mono text-base font-bold text-cyan-400">HMAC-256</span>
                <span>Anti-Fraude</span>
              </div>
              <div className="space-y-1">
                <span className="block font-mono text-base font-bold text-indigo-400">MySQL 8.4</span>
                <span>XAMPP Nativo</span>
              </div>
            </div>
          </div>

          {/* Lado Derecho: Tarjeta Holográfica del Token en Vivo */}
          <div className="relative flex flex-col items-center justify-center">
            <div className="w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-emerald-500/10 space-y-6">
              {/* Encabezado del visor */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400">
                    {liveSession ? 'SESIÓN ACTIVA' : 'TOKEN PROYECTOR'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-mono text-cyan-300 border border-slate-700/60">
                  <Radio className="size-3 animate-spin text-cyan-400" />
                  <span>{pulseSeconds}s</span>
                </div>
              </div>

              {/* Matriz QR enmarcada con brillo */}
              <div className="relative flex justify-center items-center rounded-2xl bg-white p-4 shadow-xl shadow-black/50 border-2 border-emerald-500/40">
                <QrMatrix size={190} value={currentToken} />
                <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-black/10" />
              </div>

              {/* Datos de la sesión */}
              <div className="space-y-2 text-center">
                <h3 className="font-bold text-base text-white">
                  {liveSession?.title || 'Mecatrónica Industrial y Control PLC'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {liveSession?.room || 'Taller B-204 • Sede Técnica Norte'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-300 font-mono transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Token copiado al portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <span className="truncate max-w-[200px]">{currentToken}</span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* BENTO GRID DE MÓDULOS AVANZADOS */}
      {/* ============================================================== */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Arquitectura Modular</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Capacidades del Sistema</h2>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono text-slate-400">XAMPP MySQL • FastAPI • Three.js</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/40 hover:bg-slate-900/80 shadow-xl shadow-black/20"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`flex size-12 items-center justify-center rounded-2xl border bg-gradient-to-br ${card.color}`}>
                      <Icon className="size-6" />
                    </div>
                    <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-mono text-slate-300 border border-slate-700/60">
                      {card.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-300 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={card.onClick}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-200 transition-all duration-200 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer"
                  >
                    <span>{card.buttonText}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* BANNER DE INTEGRACIÓN DE BASE DE DATOS Y ESTADO DEL SERVIDOR   */}
      {/* ============================================================== */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="size-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Base de Datos Institucional MySQL Conectada</h4>
              <p className="text-xs text-slate-400 font-mono">
                Host: localhost:3306 • BD: acadeqr_db • Motor: InnoDB utf8mb4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Zap className="size-4 text-amber-400" />
              <span>Swagger API Docs</span>
            </a>
            <a
              href="http://localhost/phpmyadmin"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/20 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors border border-emerald-500/30"
            >
              <ShieldCheck className="size-4" />
              <span>phpMyAdmin XAMPP</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
