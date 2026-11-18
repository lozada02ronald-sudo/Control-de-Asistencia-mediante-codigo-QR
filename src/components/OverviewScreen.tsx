import React, { useMemo, useState } from 'react';
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

  const [cohortCode, setCohortCode] = useState('COH-5120');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Automatización Industrial');
  const [instructor, setInstructor] = useState('');
  const [room, setRoom] = useState('');
  const [campus] = useState('Sede Técnica Norte');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [geofenceRadius, setGeofenceRadius] = useState(50);

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
    if (!title.trim() || !instructor.trim() || !room.trim()) return;

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
      gracePeriodMinutes: 10,
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
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Panel de Control · Cohortes y Asistencia
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            Resumen Institucional
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="h-11 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Sesión</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400">Tasa de Asistencia</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono-tabular">
            {summary.rate}%
          </div>
          <p className="text-xs text-slate-400">
            {summary.verifiedTotal} de {summary.totalLearners} aprendices
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400">Puntualidad</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono-tabular">
              {summary.presentCount}
            </span>
            <span className="text-xs text-slate-400">a tiempo</span>
          </div>
          <p className="text-xs text-slate-400">{summary.lateCount} con tardanza</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sesiones en Vivo</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono-tabular">
              {summary.liveCount}
            </span>
            <span className="text-xs text-slate-400">activas</span>
          </div>
          <p className="text-xs text-slate-400">Rotación continua de tokens</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400">Geocerca Máxima</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-indigo-400 font-mono-tabular">
              50
            </span>
            <span className="text-xs text-slate-400">metros</span>
          </div>
          <p className="text-xs text-slate-400">Perímetro de aula verificado</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ficha, asignatura, aula o instructor..."
            aria-label="Buscar sesiones de clase"
            className="modern-input w-full pl-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto">
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-slate-950 font-bold'
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
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
          <p className="text-xl font-bold text-white">No se encontraron sesiones coincidentes</p>
          <p className="text-sm text-slate-400">
            Ajusta los términos de búsqueda o cambia el filtro seleccionado.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
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
                className="glass-panel rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-emerald-400/35 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-cyan-400 mb-1 flex items-center gap-2">
                        <span className="font-mono-tabular">{session.cohortCode}</span>
                        <span>·</span>
                        <span className="text-slate-400 truncate">{session.department}</span>
                      </div>
                      <h2 className="text-xl font-bold text-white leading-snug">
                        {session.title}
                      </h2>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
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
                          className="text-[11px] font-semibold text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          {session.status === SessionStatus.LIVE ? 'Finalizar sesión' : 'Activar en vivo'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 border-y border-slate-800/80 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{session.room} ({session.geofenceRadiusMeters}m)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{session.startTime}–{session.endTime}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{session.instructor}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span>Asistencia Verificada</span>
                      <span className="font-mono-tabular">
                        {checkedIn}/{total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                      {total > 0 && (
                        <>
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${(present / total) * 100}%` }}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all duration-300"
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
                    className="flex-1 min-w-[140px] h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>{session.status === SessionStatus.LIVE ? 'Proyectar QR' : 'Abrir Proyector'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSessionForScanner(session.id)}
                    className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ScanLine className="w-4 h-4 text-cyan-400" />
                    <span>Escáner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSessionForRoster(session.id)}
                    className="h-10 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Registro</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Session Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-session-title"
        >
          <div className="glass-panel-elevated rounded-3xl w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 id="create-session-title" className="text-xl font-bold text-white">
                  Nueva Sesión de Clase
                </h2>
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

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Código de Cohorte
                  </label>
                  <input
                    type="text"
                    required
                    value={cohortCode}
                    onChange={(e) => setCohortCode(e.target.value)}
                    placeholder="Ej. COH-5120"
                    className="modern-input w-full text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Programa / Área
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="modern-input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Título de la Asignatura
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Circuitos Neumáticos y Actuadores"
                  className="modern-input w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Instructor
                  </label>
                  <input
                    type="text"
                    required
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="Ej. Ing. Sofía Navarro"
                    className="modern-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Aula / Taller
                  </label>
                  <input
                    type="text"
                    required
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Ej. Lab E-104"
                    className="modern-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Inicio
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="modern-input w-full text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Fin
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="modern-input w-full text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Geocerca
                  </label>
                  <select
                    value={geofenceRadius}
                    onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                    className="modern-input w-full text-sm font-mono-tabular"
                  >
                    <option value={25} className="bg-slate-900">25m</option>
                    <option value={50} className="bg-slate-900">50m</option>
                    <option value={100} className="bg-slate-900">100m</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  Activar Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
