import React from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Cpu,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { QrMatrix } from './QrMatrix';

interface LandingPageProps {
  onOpenProjector: () => void;
  onOpenScanner: () => void;
  onOpenOverview: () => void;
  onOpenAdmin?: () => void;
  pythonOnline?: boolean;
  currentToken?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenProjector,
  onOpenScanner,
  onOpenOverview,
  onOpenAdmin,
  pythonOnline = false,
  currentToken = 'ACQR-2841-A5C9B2',
}) => {
  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero Section over Three.js Background */}
      <section className="relative rounded-3xl glass-panel-elevated overflow-hidden p-6 sm:p-10 lg:p-14">
        {/* Soft radial glow accents */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Value Proposition & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-400/30 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                Motor Python (qrcode + Pillow) ·{' '}
                {pythonOnline ? 'Conectado en Vivo' : 'Modo Híbrido Activo'}
              </span>
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-[3.4rem] leading-[1.12] text-white">
              Asistencia Inteligente con{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                QR Personalizados en Python
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Genera códigos QR personalizados con colores, estilos e insignia institucional desde Python, enciende la cámara para escanear en tiempo real y lleva cada lectura directo al registro oficial de asistencia.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={onOpenProjector}
                className="inline-flex items-center gap-2.5 h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" aria-hidden="true" />
                <span>Generar QR Personalizado</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onOpenScanner}
                className="inline-flex items-center gap-2.5 h-12 px-6 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-600/60 hover:border-emerald-400/50 text-white font-semibold text-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Prender Cámara y Registrar</span>
              </button>

              <button
                type="button"
                onClick={onOpenOverview}
                className="inline-flex items-center gap-2 h-12 px-4 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 font-medium text-sm transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                <span>Ver Resumen</span>
              </button>

              {onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-2 h-12 px-4 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 font-medium text-sm transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Admin</span>
                </button>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Estilos Pillow: Redondeado, Puntos y Gradiente
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Escaneo Óptico en Vivo con Redirección al Registro
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                Fondo 3D Interactivo Three.js
              </span>
            </div>
          </div>

          {/* Right: Interactive Showcase Card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-slate-950/80 border border-slate-700/60 p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Vista Previa en Vivo
                  </span>
                  <h2 className="text-base font-bold text-white">
                    Estudio QR Dinámico
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-mono-tabular font-semibold text-emerald-300">
                  <Sparkles className="w-3 h-3" />
                  TTL 20s
                </span>
              </div>

              <div className="flex flex-col items-center py-2">
                <div className="p-4 rounded-2xl bg-white shadow-xl ring-4 ring-emerald-500/20">
                  <QrMatrix value={currentToken} size={196} />
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2">
                  <span className="text-xs text-slate-400">Token:</span>
                  <span className="font-mono-tabular text-sm font-bold text-emerald-300">
                    {currentToken}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onOpenProjector}
                  className="h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Personalizar en Python
                </button>
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="h-10 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Escanear con Cámara
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Feature Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="glass-panel rounded-2xl p-7 space-y-3 hover:border-emerald-400/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">
            QR Personalizados con Python
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Usa las librerías <code className="text-emerald-300 font-mono-tabular">qrcode</code> y{' '}
            <code className="text-emerald-300 font-mono-tabular">Pillow</code> para generar códigos QR en PNG de alta resolución con módulos redondeados, puntos, degradados radiales e insignia central.
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-7 space-y-3 hover:border-cyan-400/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
            <Camera className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Cámara en Vivo y Registro Directo
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Enciende la cámara desde el navegador para decodificar el QR en tiempo real, validar la geocerca y registrar automáticamente al aprendiz llevándolo directo al listado oficial.
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-7 space-y-3 hover:border-indigo-400/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Auditoría, RBAC y Exportación
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Consola de administración para supervisar intentos denegados, gestionar sedes y docentes, descargar backups JSON y exportar reportes de asistencia en CSV compatible con Excel.
          </p>
        </article>
      </section>

      {/* Visual Operational Showcase */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Operación en Sede
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
              Diseñado para Aulas y Talleres Técnicos
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            Tipografía adaptable, alto contraste y carga ultrarrápida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <figure className="glass-panel rounded-2xl overflow-hidden group">
            <div className="overflow-hidden">
              <img
                src="/images/hero-classroom.webp"
                alt="Proyección de código QR en aula técnica"
                width={800}
                height={500}
                loading="lazy"
                decoding="async"
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <figcaption className="p-5 space-y-1">
              <div className="text-sm font-bold text-white">
                Proyección Dinámica en Aula
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tokens rotativos cada 15s, 20s o 30s con diseño personalizado en Python para evitar suplantaciones.
              </p>
            </figcaption>
          </figure>

          <figure className="glass-panel rounded-2xl overflow-hidden group">
            <div className="overflow-hidden">
              <img
                src="/images/mobile-scan.webp"
                alt="Aprendiz escaneando código QR desde smartphone"
                width={800}
                height={500}
                loading="lazy"
                decoding="async"
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <figcaption className="p-5 space-y-1">
              <div className="text-sm font-bold text-white">
                Captura Móvil Instantánea
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Escaneo óptico mediante cámara nativa o carga de imagen con confirmación visual, sonora y paso directo al registro.
              </p>
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
  );
};
