import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  QrCode,
  ScanLine,
  Users,
  Search,
  Plus,
  MapPin,
  Clock,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  AttendanceStatus,
  CheckInMethod,
  ClassSession,
  SessionStatus,
} from '../types/attendance';
import { SessionStatusBadge } from './StatusBadge';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { SessionField, validateSessionForm } from '../utils/validators';

interface OverviewScreenProps {
  sessions: ClassSession[];
  onSelectSessionForProjector: (sessionId: string) => void;
  onSelectSessionForScanner: (sessionId: string) => void;
  onSelectSessionForRoster: (sessionId: string) => void;
  onCreateSession: (newSession: ClassSession) => void;
  onUpdateSessionStatus?: (sessionId: string, status: SessionStatus) => void;
  onResetDemoData?: () => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  sessions,
  onSelectSessionForProjector,
  onSelectSessionForScanner,
  onSelectSessionForRoster,
  onCreateSession,
  onUpdateSessionStatus,
  onResetDemoData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<'ALL' | SessionStatus>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const createDialogRef = useRef<HTMLDialogElement | null>(null);

  const [cohortCode, setCohortCode] = useState('COH-5120');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Automatización Industrial');
  const [instructor, setInstructor] = useState('');
  const [room, setRoom] = useState('');
  const [campus] = useState('Sede Técnica Norte');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<SessionField, boolean>>>({});
  const [formErrors, setFormErrors] = useState<Partial<Record<SessionField, string>>>({});

  useEffect(() => {
    const dialog = createDialogRef.current;
    if (!dialog) return;
    if (isModalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isModalOpen && dialog.open) {
      dialog.close();
    }
  }, [isModalOpen]);

  const currentFormInput = {
    cohortCode,
    title,
    department,
    instructor,
    room,
    startTime,
    endTime,
    geofenceRadius,
    gracePeriodMinutes,
  };

  const handleFieldBlur = (field: SessionField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    const res = validateSessionForm(currentFormInput);
    setFormErrors((prev) => ({ ...prev, [field]: res.errors[field] }));
  };

  const clearFieldErrorIfFixed = (
    field: SessionField,
    nextPartial: Partial<typeof currentFormInput>
  ) => {
    if (!formErrors[field] && !touchedFields[field]) return;
    const res = validateSessionForm({ ...currentFormInput, ...nextPartial });
    if (!res.errors[field]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const summary = useMemo(() => {
    let totalLearners = 0;
    let presentCount = 0;
    let lateCount = 0;
    let liveCount = 0;

    sessions.forEach((session) => {
      if (session.status === SessionStatus.LIVE) liveCount += 1;
      totalLearners += session.learners.length;
      session.records.forEach((rec) => {
        if (rec.status === AttendanceStatus.PRESENT) presentCount += 1;
        if (rec.status === AttendanceStatus.LATE) lateCount += 1;
      });
    });

    const verifiedTotal = presentCount + lateCount;
    const rate = totalLearners > 0 ? Math.round((verifiedTotal / totalLearners) * 1000) / 10 : 0;

    return {
      totalLearners,
      verifiedTotal,
      presentCount,
      lateCount,
      liveCount,
      rate,
    };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const q = debouncedSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.cohortCode.toLowerCase().includes(q) ||
        s.instructor.toLowerCase().includes(q) ||
        s.room.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [sessions, statusFilter, debouncedSearch]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSessionForm(currentFormInput);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      const firstInvalid = Object.keys(validation.errors)[0] as SessionField | undefined;
      if (firstInvalid) {
        const el = createDialogRef.current?.querySelector<HTMLElement>(
          `[name="${firstInvalid}"]`
        );
        el?.focus();
      }
      return;
    }

    const id = `ses-${Date.now().toString().slice(-4)}`;
    const defaultLearners = [
      { id: `${id}-l1`, fullName: 'Alejandro Torres Vega', nationalId: 'CC 1.049.210.334', program: department, avatarColor: '#10b981' },
      { id: `${id}-l2`, fullName: 'Valeria Gómez Pardo', nationalId: 'CC 1.028.774.129', program: department, avatarColor: '#06b6d4' },
      { id: `${id}-l3`, fullName: 'Samuel Ortiz Muñoz', nationalId: 'CC 1.091.452.880', program: department, avatarColor: '#6366f1' },
      { id: `${id}-l4`, fullName: 'Melissa Castro Rivera', nationalId: 'CC 1.076.118.540', program: department, avatarColor: '#f59e0b' },
    ];

    const newSession: ClassSession = {
      id,
      cohortCode: cohortCode.trim().toUpperCase() || 'COH-NEW',
      title: title.trim(),
      department: department.trim(),
      instructor: instructor.trim(),
      room: room.trim(),
      campus: campus.trim(),
      startTime,
      endTime,
      dateLabel: 'Hoy',
      status: SessionStatus.LIVE,
      geofenceRadiusMeters: geofenceRadius,
      gracePeriodMinutes,
      learners: defaultLearners,
      records: defaultLearners.map((l) => ({
        learnerId: l.id,
        status: AttendanceStatus.ABSENT,
        checkedInAt: null,
        method: CheckInMethod.NONE,
        distanceMeters: null,
        tokenSignature: null,
      })),
    };

    onCreateSession(newSession);
    setTitle('');
    setInstructor('');
    setRoom('');
    setFormErrors({});
    setTouchedFields({});
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              TELEMETRÍA EN VIVO
            </span>
            <span className="text-slate-500 font-mono text-[11px]">/</span>
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              Aulas & Cohortes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Monitoreo de Sesiones Académicas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supervisión de cohortes en tiempo real, registro de presencia por código QR rotativo y calibración de geocerca.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-8 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Sesión</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip - High-Tech Telemetry HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping-slow" />
              MÉTRICA // 01
            </span>
            <span className="text-slate-400 text-[10px]">TASA GLOBAL</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono-tabular tracking-tight">
              {summary.rate}%
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
              {summary.verifiedTotal}/{summary.totalLearners}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-white/[0.06]">
            <span>Presencia confirmada</span>
            <span className="font-mono text-[11px] text-slate-300">En Aula</span>
          </div>
        </div>

        <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className="size-1.5 rounded-full bg-cyan-400" />
              PUNTUALIDAD // 02
            </span>
            <span className="text-slate-400 text-[10px]">A TIEMPO</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 font-mono-tabular tracking-tight">
              {summary.presentCount}
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
              {summary.lateCount} TARDANZAS
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-white/[0.06]">
            <span>Dentro de margen</span>
            <span className="font-mono text-[11px] text-slate-300">Margen 10m</span>
          </div>
        </div>

        <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              EN VIVO // 03
            </span>
            <span className="text-slate-400 text-[10px]">SESIONES ACTIVAS</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono-tabular tracking-tight">
              {summary.liveCount}
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
              ROTANDO
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-white/[0.06]">
            <span>Generación de QR activa</span>
            <span className="font-mono text-[11px] text-slate-300">TTL 20s</span>
          </div>
        </div>

        <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[11px] font-mono text-indigo-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className="size-1.5 rounded-full bg-indigo-400" />
              PERÍMETRO // 04
            </span>
            <span className="text-slate-400 text-[10px]">GEOCERCA GPS</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-300 font-mono-tabular tracking-tight">
              50<span className="text-lg font-normal text-slate-400 ml-1">m</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30">
              CALIBRADO
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-white/[0.06]">
            <span>Radio perimetral seguro</span>
            <span className="font-mono text-[11px] text-slate-300">Antifraude</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-[#080d18] border border-white/[0.07]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cohorte, programa, aula o docente..."
            aria-label="Buscar sesiones de clase"
            className="w-full h-8 pl-9 pr-3 rounded-lg bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-white/10 overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'Todas' },
              { key: SessionStatus.LIVE, label: 'En Vivo' },
              { key: SessionStatus.SCHEDULED, label: 'Programadas' },
              { key: SessionStatus.COMPLETED, label: 'Finalizadas' },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`h-7 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${active
                    ? 'bg-slate-800 text-white font-semibold border border-white/15'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="cyber-panel rounded-xl p-12 text-center space-y-3 border border-white/[0.08]">
          <p className="text-xl font-bold text-slate-100">No se encontraron sesiones coincidentes</p>
          <p className="text-sm text-slate-400">
            Ajusta los términos de búsqueda o cambia el filtro seleccionado.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold cursor-pointer"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredSessions.map((session) => {
            const total = session.learners.length;
            const present = session.records.filter(
              (r) => r.status === AttendanceStatus.PRESENT
            ).length;
            const late = session.records.filter(
              (r) => r.status === AttendanceStatus.LATE
            ).length;
            const checkedIn = present + late;
            const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

            return (
              <article
                key={session.id}
                className="cyber-panel rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5 border border-white/[0.08] hover:border-emerald-500/35 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-2 font-mono">
                        <span className="font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">{session.cohortCode}</span>
                        <span>·</span>
                        <span className="text-slate-400 truncate">{session.department}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                        {session.title}
                      </h2>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <SessionStatusBadge status={session.status} />
                      {onUpdateSessionStatus && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSessionStatus(
                              session.id,
                              session.status === SessionStatus.LIVE
                                ? SessionStatus.COMPLETED
                                : SessionStatus.LIVE
                            )
                          }
                          className="text-[11px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          {session.status === SessionStatus.LIVE ? 'Finalizar sesión' : 'Activar en vivo'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 border-y border-white/[0.06] py-2.5 font-mono">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{session.room} ({session.geofenceRadiusMeters}m)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{session.startTime}–{session.endTime}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{session.instructor}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider">Asistencia Verificada</span>
                      <span className="font-mono-tabular font-bold text-emerald-400">
                        {checkedIn}/{total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-900 border border-white/[0.05] overflow-hidden flex">
                      {total > 0 && (
                        <>
                          <div
                            className="h-full bg-emerald-400 transition-all duration-300 shadow-[0_0_8px_#34d399]"
                            style={{ width: `${(present / total) * 100}%` }}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all duration-300 shadow-[0_0_8px_#fbbf24]"
                            style={{ width: `${(late / total) * 100}%` }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectSessionForProjector(session.id)}
                    className="flex-1 min-w-[130px] h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-emerald-950/50"
                  >
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    <span>{session.status === SessionStatus.LIVE ? 'Proyectar QR' : 'Abrir Proyector'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSessionForScanner(session.id)}
                    className="h-9 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ScanLine className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Escanear</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSessionForRoster(session.id)}
                    className="h-9 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Listado</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Session Modal (native <dialog>) */}
      <dialog
        ref={createDialogRef}
        aria-labelledby="create-session-title"
        onClose={() => setIsModalOpen(false)}
        className="w-full max-w-lg rounded-3xl p-0"
      >
        <div className="glass-panel-elevated rounded-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h1 id="create-session-title" className="text-xl font-bold text-slate-100">
                Nueva Sesión de Clase
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configura los parámetros del aula y la geocerca
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="Cerrar ventana"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="session-cohort" className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Código de Cohorte *
                </label>
                <input
                  id="session-cohort"
                  name="cohortCode"
                  type="text"
                  autoFocus
                  required
                  value={cohortCode}
                  onChange={(e) => {
                    setCohortCode(e.target.value);
                    clearFieldErrorIfFixed('cohortCode', { cohortCode: e.target.value });
                  }}
                  onBlur={() => handleFieldBlur('cohortCode')}
                  aria-invalid={Boolean(formErrors.cohortCode)}
                  aria-describedby={formErrors.cohortCode ? 'err-cohortCode' : undefined}
                  placeholder="Ej. COH-5120"
                  className="modern-input w-full text-sm font-mono-tabular"
                />
                {formErrors.cohortCode && (
                  <p id="err-cohortCode" className="mt-1 text-xs text-rose-400">
                    {formErrors.cohortCode}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="session-dept" className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Programa / Área *
                </label>
                <input
                  id="session-dept"
                  name="department"
                  type="text"
                  required
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    clearFieldErrorIfFixed('department', { department: e.target.value });
                  }}
                  onBlur={() => handleFieldBlur('department')}
                  aria-invalid={Boolean(formErrors.department)}
                  aria-describedby={formErrors.department ? 'err-department' : undefined}
                  className="modern-input w-full text-sm"
                />
                {formErrors.department && (
                  <p id="err-department" className="mt-1 text-xs text-rose-400">
                    {formErrors.department}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="session-title" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Título de la Asignatura *
              </label>
              <input
                id="session-title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearFieldErrorIfFixed('title', { title: e.target.value });
                }}
                onBlur={() => handleFieldBlur('title')}
                aria-invalid={Boolean(formErrors.title)}
                aria-describedby={formErrors.title ? 'err-title' : undefined}
                placeholder="Ej. Circuitos Neumáticos y Actuadores"
                className="modern-input w-full text-sm"
              />
              {formErrors.title && (
                <p id="err-title" className="mt-1 text-xs text-rose-400">
                  {formErrors.title}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="session-instructor" className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Instructor *
                </label>
                <input
                  id="session-instructor"
                  name="instructor"
                  type="text"
                  required
                  value={instructor}
                  onChange={(e) => {
                    setInstructor(e.target.value);
                    clearFieldErrorIfFixed('instructor', { instructor: e.target.value });
                  }}
                  onBlur={() => handleFieldBlur('instructor')}
                  aria-invalid={Boolean(formErrors.instructor)}
                  aria-describedby={formErrors.instructor ? 'err-instructor' : undefined}
                  placeholder="Ej. Ing. Sofía Navarro"
                  className="modern-input w-full text-sm"
                />
                {formErrors.instructor && (
                  <p id="err-instructor" className="mt-1 text-xs text-rose-400">
                    {formErrors.instructor}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="session-room" className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Aula / Taller *
                </label>
                <input
                  id="session-room"
                  name="room"
                  type="text"
                  required
                  value={room}
                  onChange={(e) => {
                    setRoom(e.target.value);
                    clearFieldErrorIfFixed('room', { room: e.target.value });
                  }}
                  onBlur={() => handleFieldBlur('room')}
                  aria-invalid={Boolean(formErrors.room)}
                  aria-describedby={formErrors.room ? 'err-room' : undefined}
                  placeholder="Ej. Lab E-104"
                  className="modern-input w-full text-sm"
                />
                {formErrors.room && (
                  <p id="err-room" className="mt-1 text-xs text-rose-400">
                    {formErrors.room}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="session-start" className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Inicio
                </label>
                <input
                  id="session-start"
                  name="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    clearFieldErrorIfFixed('startTime', { startTime: e.target.value });
                    clearFieldErrorIfFixed('endTime', { startTime: e.target.value });
                  }}
                  onBlur={() => handleFieldBlur('startTime')}
                  aria-invalid={Boolean(formErrors.startTime)}
                  className="modern-input w-full text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="session-end" className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Fin
                </label>
                <input
                  id="session-end"
                  name="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    clearFieldErrorIfFixed('endTime', { endTime: e.target.value });
                  }}
                  onBlur={() => handleFieldBlur('endTime')}
                  aria-invalid={Boolean(formErrors.endTime)}
                  aria-describedby={formErrors.endTime ? 'err-endTime' : undefined}
                  className="modern-input w-full text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="session-geofence" className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Geocerca
                </label>
                <select
                  id="session-geofence"
                  name="geofenceRadius"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  className="modern-input w-full text-sm font-mono-tabular"
                >
                  <option value={25} className="bg-slate-900">25m</option>
                  <option value={50} className="bg-slate-900">50m</option>
                  <option value={100} className="bg-slate-900">100m</option>
                  <option value={200} className="bg-slate-900">200m</option>
                </select>
              </div>
              <div>
                <label htmlFor="session-grace" className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Gracia (min)
                </label>
                <input
                  id="session-grace"
                  name="gracePeriodMinutes"
                  type="number"
                  min={0}
                  max={60}
                  value={gracePeriodMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setGracePeriodMinutes(val);
                    clearFieldErrorIfFixed('gracePeriodMinutes', { gracePeriodMinutes: val });
                  }}
                  onBlur={() => handleFieldBlur('gracePeriodMinutes')}
                  aria-invalid={Boolean(formErrors.gracePeriodMinutes)}
                  className="modern-input w-full text-sm font-mono-tabular"
                />
              </div>
            </div>
            {(formErrors.endTime || formErrors.gracePeriodMinutes) && (
              <p id="err-endTime" className="text-xs text-rose-400">
                {formErrors.endTime || formErrors.gracePeriodMinutes}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Activar Sesión
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
};
