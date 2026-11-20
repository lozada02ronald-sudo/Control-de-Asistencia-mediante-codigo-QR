import { CalendarDays, ClipboardList, GraduationCap, IdCard, QrCode, ScanLine } from 'lucide-react';
import { QrMatrix } from './QrMatrix';

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
  const actions = [
    {
      icon: ScanLine,
      title: 'Escanear un QR',
      description: 'Usa la cámara o carga una imagen del código de asistencia.',
      onClick: onOpenScanner,
    },
    {
      icon: isStudent ? ClipboardList : CalendarDays,
      title: isStudent ? 'Mis asistencias' : 'Sesiones de clase',
      description: isStudent
        ? 'Consulta tus registros, tardanzas y ausencias.'
        : 'Crea sesiones y consulta los listados de cada grupo.',
      onClick: onOpenOverview,
    },
    {
      icon: isStudent ? IdCard : QrCode,
      title: isStudent ? 'Mi carné QR' : 'Proyector QR',
      description: isStudent
        ? 'Abre tu identificación académica en el celular.'
        : 'Muestra en el aula un código que se actualiza durante la sesión.',
      onClick: isStudent ? onOpenStudentCard : onOpenProjector,
    },
  ];

  const showLiveQr = !isStudent && liveSession;

  return (
    <div className="space-y-9">
      <section className="relative grid overflow-hidden rounded-[1.75rem] bg-[#f6e5d8] lg:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col items-start justify-center gap-5 p-6 sm:p-10 xl:p-14">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-700">
            <GraduationCap className="size-5" aria-hidden="true" />
            {isStudent ? 'Portal estudiantil' : 'Portal docente'}
          </p>
          <h1 className="max-w-2xl font-editorial text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-espresso sm:text-6xl">
            Hola, {name.trim().split(/\s+/)[0]}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-slate-300">
            {isStudent
              ? 'Registra tu llegada a clase y revisa tu historial de asistencia.'
              : 'Abre una sesión de clase, proyecta el código QR y consulta quién asistió.'}
          </p>
          <button
            type="button"
            onClick={isStudent ? onOpenScanner : onOpenOverview}
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-700 cursor-pointer"
          >
            {isStudent ? <ScanLine className="size-5" /> : <CalendarDays className="size-5" />}
            {isStudent ? 'Registrar asistencia' : 'Ver sesiones de clase'}
          </button>
        </div>

        {showLiveQr ? (
          <div className="flex flex-col items-center justify-center gap-4 bg-espresso p-6 text-center text-white sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
              <span className="size-2 rounded-full bg-[#8bd4a6]" aria-hidden="true" />
              Sesión en vivo
            </span>
            <div className="rounded-xl bg-white p-2">
              <QrMatrix size={146} value={liveSession.token} />
            </div>
            <div className="space-y-1">
              <h2 className="font-bold">{liveSession.title}</h2>
              <p className="text-sm text-brand-100">{liveSession.room}</p>
            </div>
          </div>
        ) : (
          <img
            src={isStudent ? '/images/mobile-scan.webp' : '/images/hero-classroom.webp'}
            alt={isStudent ? 'Un estudiante escanea el QR de clase' : 'Un código QR proyectado en el auditorio'}
            width={1376}
            height={768}
            className="h-full min-h-48 max-h-72 w-full object-cover sepia-20 lg:max-h-none"
          />
        )}
      </section>

      <section aria-labelledby="quick-actions" className="space-y-4">
        <h2 id="quick-actions" className="text-2xl font-extrabold text-espresso">Accesos rápidos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {actions.map(({ icon: Icon, title, description, onClick }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-slate-800 bg-white p-5 text-left transition-colors hover:border-brand-500 hover:bg-brand-50 sm:p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold text-espresso">{title}</span>
              <span className="text-sm leading-relaxed text-slate-400">{description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
