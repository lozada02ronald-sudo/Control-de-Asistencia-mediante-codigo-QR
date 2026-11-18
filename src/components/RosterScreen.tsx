import React, { useMemo, useState } from 'react';
import {
  Search,
  Download,
  UserPlus,
  MapPin,
  Clock,
  X,
} from 'lucide-react';
import {
  AttendanceStatus,
  ClassSession,
  Learner,
} from '../types/attendance';
import {
  downloadAttendanceCsv,
  getInitials,
} from '../data/mockInstitution';
import { AttendanceStatusBadge } from './StatusBadge';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface RosterScreenProps {
  sessions: ClassSession[];
  activeSession: ClassSession;
  onSelectSession: (sessionId: string) => void;
  onSetLearnerStatus: (
    sessionId: string,
    learnerId: string,
    status: AttendanceStatus
  ) => void;
  onAddLearner: (sessionId: string, learner: Learner) => void;
  allowManualOverride?: boolean;
}

export const RosterScreen: React.FC<RosterScreenProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  onSetLearnerStatus,
  onAddLearner,
  allowManualOverride = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');

  const counts = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    activeSession.records.forEach((r) => {
      if (r.status === AttendanceStatus.PRESENT) present += 1;
      else if (r.status === AttendanceStatus.LATE) late += 1;
      else absent += 1;
    });
    return {
      total: activeSession.learners.length,
      present,
      late,
      absent,
    };
  }, [activeSession]);

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return activeSession.learners
      .map((learner) => {
        const record = activeSession.records.find((r) => r.learnerId === learner.id);
        return {
          learner,
          status: record?.status ?? AttendanceStatus.ABSENT,
          record,
        };
      })
      .filter(({ learner, status }) => {
        const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
        const matchesQuery =
          !q ||
          learner.fullName.toLowerCase().includes(q) ||
          learner.nationalId.toLowerCase().includes(q);
        return matchesStatus && matchesQuery;
      });
  }, [activeSession, debouncedSearch, statusFilter]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newNationalId.trim()) return;
    const colors = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b'];
    const learner: Learner = {
      id: `lrn-${Date.now().toString().slice(-5)}`,
      fullName: newName.trim(),
      nationalId: newNationalId.trim().toUpperCase(),
      program: activeSession.department,
      avatarColor: colors[activeSession.learners.length % colors.length],
    };
    onAddLearner(activeSession.id, learner);
    setNewName('');
    setNewNationalId('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Registro Oficial de Asistencia por Cohorte
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Listado de Asistencia
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Seleccionar listado de cohorte"
            value={activeSession.id}
            onChange={(e) => onSelectSession(e.target.value)}
            className="modern-input text-sm font-semibold min-w-[240px]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900">
                {s.cohortCode} — {s.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-cyan-400" />
            <span>Inscribir Aprendiz</span>
          </button>

          <button
            type="button"
            onClick={() => downloadAttendanceCsv(activeSession)}
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Cohort Summary Strip */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-cyan-400">
            {activeSession.cohortCode} · {activeSession.room} · {activeSession.instructor}
          </div>
          <div className="text-lg font-bold text-white mt-0.5">{activeSession.title}</div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm font-mono-tabular">
          <div>
            <span className="text-[11px] text-slate-400 block">Presentes</span>
            <span className="font-bold text-emerald-400 text-xl">{counts.present}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Tardanzas</span>
            <span className="font-bold text-amber-400 text-xl">{counts.late}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Ausentes</span>
            <span className="font-bold text-rose-400 text-xl">{counts.absent}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Inscritos</span>
            <span className="font-bold text-white text-xl">{counts.total}</span>
          </div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nombre o documento..."
            aria-label="Filtrar aprendices"
            className="modern-input w-full pl-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto">
          {(
            [
              { key: 'ALL', label: `Todos (${counts.total})` },
              { key: AttendanceStatus.PRESENT, label: `Presentes (${counts.present})` },
              { key: AttendanceStatus.LATE, label: `Tardanzas (${counts.late})` },
              { key: AttendanceStatus.ABSENT, label: `Ausentes (${counts.absent})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === tab.key
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Learner Rows */}
      {filteredRows.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <p className="text-base font-bold text-white">No hay aprendices que coincidan</p>
          <p className="text-sm text-slate-400 mt-1">
            Ajusta el término de búsqueda o selecciona otra pestaña.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRows.map(({ learner, status, record }) => (
            <div
              key={learner.id}
              className="glass-panel rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner"
                  style={{ backgroundColor: learner.avatarColor || '#059669' }}
                  aria-hidden="true"
                >
                  {getInitials(learner.fullName)}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {learner.fullName}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono-tabular font-semibold text-slate-300">
                      {learner.nationalId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{record?.method ?? 'Sin registro'}</span>
                    {record?.distanceMeters !== null && record?.distanceMeters !== undefined && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular text-emerald-400">
                          <MapPin className="w-3 h-3" />
                          {record.distanceMeters}m
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
                <div className="flex items-center gap-2.5">
                  {record?.checkedInAt && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono-tabular text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {record.checkedInAt}
                    </span>
                  )}
                  <AttendanceStatusBadge status={status} />
                </div>

                <div
                  className={`inline-flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 ${
                    !allowManualOverride ? 'opacity-50' : ''
                  }`}
                  role="group"
                  aria-label={`Definir estado de asistencia para ${learner.fullName}`}
                  title={!allowManualOverride ? 'Override manual deshabilitado en Administración' : undefined}
                >
                  {(
                    [
                      { key: AttendanceStatus.PRESENT, label: 'P', title: 'Presente' },
                      { key: AttendanceStatus.LATE, label: 'T', title: 'Tardanza' },
                      { key: AttendanceStatus.ABSENT, label: 'A', title: 'Ausente' },
                    ] as const
                  ).map((opt) => {
                    const isActive = status === opt.key;
                    let activeStyle = '';
                    if (isActive && opt.key === AttendanceStatus.PRESENT) {
                      activeStyle = 'bg-emerald-500 text-slate-950 font-bold';
                    } else if (isActive && opt.key === AttendanceStatus.LATE) {
                      activeStyle = 'bg-amber-400 text-slate-950 font-bold';
                    } else if (isActive && opt.key === AttendanceStatus.ABSENT) {
                      activeStyle = 'bg-rose-500 text-white font-bold';
                    }
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={!allowManualOverride}
                        title={allowManualOverride ? opt.title : 'Override manual deshabilitado por Admin'}
                        onClick={() => onSetLearnerStatus(activeSession.id, learner.id, opt.key)}
                        className={`w-8 h-8 rounded-lg text-xs font-mono-tabular transition-colors ${
                          allowManualOverride ? 'cursor-pointer' : 'cursor-not-allowed'
                        } ${
                          isActive ? activeStyle : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enroll Learner Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enroll-learner-title"
        >
          <div className="glass-panel-elevated rounded-3xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 id="enroll-learner-title" className="text-lg font-bold text-white">
                Inscribir Aprendiz en {activeSession.cohortCode}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Cerrar ventana"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Natalia Ortiz Castaño"
                  className="modern-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Documento de Identidad
                </label>
                <input
                  type="text"
                  required
                  value={newNationalId}
                  onChange={(e) => setNewNationalId(e.target.value)}
                  placeholder="Ej. CC 1.095.442.190"
                  className="modern-input w-full text-sm font-mono-tabular"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  Agregar al Listado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
