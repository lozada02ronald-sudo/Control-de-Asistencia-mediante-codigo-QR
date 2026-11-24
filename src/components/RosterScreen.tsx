import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Download,
  UserPlus,
  MapPin,
  Clock,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  CheckInMethod,
  ClassSession,
  Learner,
} from '../types/attendance';
import {
  downloadAttendanceCsv,
  formatTimeNow,
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

const DAILY_ROSTER_KEY = 'acadeqr_daily_roster_v1';

type DailyRosterMap = Record<string, Record<string, Record<string, AttendanceRecord>>>;

function getLocalIsoDate(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return getLocalIsoDate(dt);
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export const RosterScreen: React.FC<RosterScreenProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  onSetLearnerStatus,
  onAddLearner,
  allowManualOverride = true,
}) => {
  const todayIso = useMemo(() => getLocalIsoDate(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [calendarView, setCalendarView] = useState<'none' | 'month' | 'year'>('none');
  const [dailyRecords, setDailyRecords] = useState<DailyRosterMap>(() => {
    try {
      const raw = localStorage.getItem(DAILY_ROSTER_KEY);
      if (raw) return JSON.parse(raw) as DailyRosterMap;
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(DAILY_ROSTER_KEY, JSON.stringify(dailyRecords));
    } catch {
      // ignore
    }
  }, [dailyRecords]);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');

  const isToday = selectedDate === todayIso;

  const getRecordForLearner = (learnerId: string): AttendanceRecord | undefined => {
    if (isToday) {
      return activeSession.records.find((r) => r.learnerId === learnerId);
    }
    return dailyRecords[activeSession.id]?.[selectedDate]?.[learnerId];
  };

  const handleMarkDateStatus = (learnerId: string, status: AttendanceStatus) => {
    if (isToday) {
      onSetLearnerStatus(activeSession.id, learnerId, status);
      return;
    }
    const timeStr = formatTimeNow();
    setDailyRecords((prev) => {
      const sessionMap = prev[activeSession.id] ?? {};
      const dateMap = sessionMap[selectedDate] ?? {};
      const nextRecord: AttendanceRecord =
        status === AttendanceStatus.ABSENT
          ? {
            learnerId,
            status: AttendanceStatus.ABSENT,
            checkedInAt: null,
            checkedInDate: formatDisplayDate(selectedDate),
            method: CheckInMethod.NONE,
            distanceMeters: null,
            tokenSignature: null,
          }
          : {
            learnerId,
            status,
            checkedInAt: dateMap[learnerId]?.checkedInAt ?? timeStr,
            checkedInDate: formatDisplayDate(selectedDate),
            method: CheckInMethod.INSTRUCTOR_OVERRIDE,
            distanceMeters: null,
            tokenSignature: null,
          };

      return {
        ...prev,
        [activeSession.id]: {
          ...sessionMap,
          [selectedDate]: {
            ...dateMap,
            [learnerId]: nextRecord,
          },
        },
      };
    });
  };

  const counts = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    activeSession.learners.forEach((l) => {
      const r = isToday
        ? activeSession.records.find((rec) => rec.learnerId === l.id)
        : dailyRecords[activeSession.id]?.[selectedDate]?.[l.id];
      const st = r?.status ?? AttendanceStatus.ABSENT;
      if (st === AttendanceStatus.PRESENT) present += 1;
      else if (st === AttendanceStatus.LATE) late += 1;
      else absent += 1;
    });
    return {
      total: activeSession.learners.length,
      present,
      late,
      absent,
    };
  }, [activeSession, isToday, dailyRecords, selectedDate]);

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return activeSession.learners
      .map((learner) => {
        const record = getRecordForLearner(learner.id);
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
  }, [activeSession, debouncedSearch, statusFilter, isToday, dailyRecords, selectedDate]);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              REGISTRO OFICIAL
            </span>
            <span className="text-slate-500 font-mono text-[11px]">/</span>
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              Control de Asistencia
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bitácora de Asistencia y Matriz Diaria
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Validación de puntualidad por cohorte, auditoría de presencias y exportación certificada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Seleccionar listado de cohorte"
            value={activeSession.id}
            onChange={(e) => onSelectSession(e.target.value)}
            className="h-8 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50 min-w-[200px]"
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
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inscribir</span>
          </button>

          <button
            type="button"
            onClick={() => downloadAttendanceCsv(activeSession)}
            className="h-8 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Cohort Summary Strip - Cyber Panel */}
      <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/[0.08]">
        <div>
          <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">{activeSession.cohortCode}</span>
            <span>·</span>
            <span className="text-slate-400">{activeSession.room}</span>
            <span>·</span>
            <span className="text-slate-400">{activeSession.instructor}</span>
          </div>
          <div className="text-lg font-bold text-white mt-1">{activeSession.title}</div>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:gap-6 font-mono text-center md:text-right">
          <div className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Presentes</span>
            <span className="font-bold text-emerald-400 text-xl">{counts.present}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tardanzas</span>
            <span className="font-bold text-amber-400 text-xl">{counts.late}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ausentes</span>
            <span className="font-bold text-rose-400 text-xl">{counts.absent}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total</span>
            <span className="font-bold text-white text-xl">{counts.total}</span>
          </div>
        </div>
      </div>

      {/* Attendance Calendar Bar & Optional Monthly Grid */}
      <div className="cyber-panel rounded-xl p-4 sm:p-5 space-y-4 border border-white/[0.08]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <span>Calendario de Asistencia</span>
                {isToday ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Hoy · En Vivo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {formatDisplayDate(selectedDate)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Selecciona cualquier día en el calendario para consultar o marcar P / T / A por aprendiz.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIsoDate(d, -1))}
              aria-label="Día anterior"
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              aria-label="Fecha de asistencia"
              className="modern-input h-9 text-xs font-mono-tabular px-3"
            />

            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIsoDate(d, 1))}
              aria-label="Día siguiente"
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className="h-9 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-semibold cursor-pointer"
              >
                Ir a Hoy
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setCalendarView((v) => (v === 'year' ? 'none' : 'year'))
              }
              className={`h-9 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${calendarView === 'year'
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                }`}
            >
              {calendarView === 'year' ? 'Ocultar 12 Meses' : 'Calendario Anual (12 Meses)'}
            </button>

            <button
              type="button"
              onClick={() =>
                setCalendarView((v) => (v === 'month' ? 'none' : 'month'))
              }
              className={`h-9 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${calendarView === 'month'
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                }`}
            >
              {calendarView === 'month' ? 'Ocultar Mes' : 'Ver Mes'}
            </button>
          </div>
        </div>

        {calendarView !== 'none' && (() => {
          const [y, m] = selectedDate.split('-').map(Number);
          const year = y || new Date().getFullYear();
          const monthIdx = (m || 1) - 1;
          const yearsList = Array.from({ length: 12 }, (_, idx) => 2024 + idx);

          const renderMonthCard = (targetMonthIdx: number, compact: boolean) => {
            const firstDay = new Date(year, targetMonthIdx, 1);
            const daysInMonth = new Date(year, targetMonthIdx + 1, 0).getDate();
            const startWeekday = (firstDay.getDay() + 6) % 7;
            const monthName = firstDay.toLocaleDateString('es-ES', { month: 'long' });
            const cells: (string | null)[] = [
              ...Array.from({ length: startWeekday }, () => null),
              ...Array.from({ length: daysInMonth }, (_, idx) =>
                getLocalIsoDate(new Date(year, targetMonthIdx, idx + 1))
              ),
            ];

            return (
              <div
                key={targetMonthIdx}
                className={
                  compact
                    ? 'rounded-2xl bg-slate-900/75 border border-slate-800 p-3 space-y-2'
                    : 'space-y-3'
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 capitalize">
                    {monthName} {year}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                    <div key={d} className="py-0.5">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((iso, i) => {
                    if (!iso) return <div key={`empty-${targetMonthIdx}-${i}`} />;
                    const dayNum = Number(iso.split('-')[2]);
                    const selected = iso === selectedDate;
                    const dayMap = dailyRecords[activeSession.id]?.[iso];
                    let pCount = 0;
                    let tCount = 0;
                    let fCount = 0;

                    if (iso === todayIso) {
                      activeSession.records.forEach((r) => {
                        if (r.status === AttendanceStatus.PRESENT) pCount += 1;
                        else if (r.status === AttendanceStatus.LATE) tCount += 1;
                        else fCount += 1;
                      });
                    } else if (dayMap) {
                      Object.values(dayMap).forEach((r) => {
                        if (r.status === AttendanceStatus.PRESENT) pCount += 1;
                        else if (r.status === AttendanceStatus.LATE) tCount += 1;
                        else fCount += 1;
                      });
                    }
                    const hasData = pCount + tCount + fCount > 0;

                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedDate(iso)}
                        title={
                          hasData
                            ? `${formatDisplayDate(iso)} · Asistencias: ${pCount}, Retardos: ${tCount}, Fallas: ${fCount}`
                            : formatDisplayDate(iso)
                        }
                        className={`${compact ? 'h-9 text-[11px]' : 'h-12 text-xs'
                          } rounded-lg font-mono-tabular flex flex-col items-center justify-center leading-tight transition-colors cursor-pointer relative ${selected
                            ? 'bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold'
                            : iso === todayIso
                              ? 'bg-slate-800 border border-emerald-500/40 text-emerald-300 hover:bg-slate-700'
                              : hasData
                                ? 'bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-400'
                                : 'bg-slate-950/60 border border-slate-800/80 text-slate-300 hover:border-slate-600'
                          }`}
                      >
                        <span>{dayNum}</span>
                        {hasData && (
                          compact ? (
                            <span className="flex items-center gap-0.5 mt-0.5">
                              {pCount > 0 && <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-slate-950' : 'bg-emerald-400'}`} />}
                              {tCount > 0 && <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-amber-900' : 'bg-amber-400'}`} />}
                              {fCount > 0 && <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-rose-900' : 'bg-rose-400'}`} />}
                            </span>
                          ) : (
                            <span className={`text-[9px] font-bold flex items-center gap-1 ${selected ? 'text-slate-950' : ''}`}>
                              {pCount > 0 && <span className={selected ? '' : 'text-emerald-400'}>{pCount}A</span>}
                              {tCount > 0 && <span className={selected ? '' : 'text-amber-400'}>{tCount}R</span>}
                              {fCount > 0 && <span className={selected ? '' : 'text-rose-400'}>{fCount}F</span>}
                            </span>
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          };

          return (
            <div className="pt-3 border-t border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextYear = year - 1;
                      setSelectedDate(
                        `${nextYear}-${String(monthIdx + 1).padStart(2, '0')}-${selectedDate.split('-')[2]}`
                      );
                    }}
                    className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer"
                  >
                    ‹ {year - 1}
                  </button>
                  <select
                    aria-label="Seleccionar año del calendario"
                    value={year}
                    onChange={(e) => {
                      const nextYear = Number(e.target.value);
                      setSelectedDate(
                        `${nextYear}-${String(monthIdx + 1).padStart(2, '0')}-${selectedDate.split('-')[2]}`
                      );
                    }}
                    className="modern-input h-8 text-xs font-mono-tabular font-bold px-2.5"
                  >
                    {yearsList.map((yr) => (
                      <option key={yr} value={yr} className="bg-slate-900">
                        Año {yr}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const nextYear = year + 1;
                      setSelectedDate(
                        `${nextYear}-${String(monthIdx + 1).padStart(2, '0')}-${selectedDate.split('-')[2]}`
                      );
                    }}
                    className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer"
                  >
                    {year + 1} ›
                  </button>
                </div>
                <span className="text-[11px] text-slate-400">
                  Punto verde = día con asistencias registradas · Haz clic en cualquier día para marcar P / T / A
                </span>
              </div>

              {calendarView === 'year' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 12 }, (_, mIdx) => renderMonthCard(mIdx, true))}
                </div>
              ) : (
                renderMonthCard(monthIdx, false)
              )}
            </div>
          );
        })()}
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${statusFilter === tab.key
                  ? 'bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-100'
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
          <p className="text-base font-bold text-slate-100">No hay aprendices que coincidan</p>
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
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-100 text-xs font-bold shrink-0 shadow-inner"
                  style={{ backgroundColor: learner.avatarColor || '#059669' }}
                  aria-hidden="true"
                >
                  {getInitials(learner.fullName)}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-100 truncate">
                    {learner.fullName}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono-tabular font-semibold text-slate-300">
                      {learner.nationalId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-cyan-300 font-medium">
                      {learner.program} ({activeSession.campus})
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
                  className={`inline-flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 ${!allowManualOverride ? 'opacity-50' : ''
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
                      activeStyle = 'bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold';
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
                        onClick={() => handleMarkDateStatus(learner.id, opt.key)}
                        className={`w-8 h-8 rounded-lg text-xs font-mono-tabular transition-colors ${allowManualOverride ? 'cursor-pointer' : 'cursor-not-allowed'
                          } ${isActive ? activeStyle : 'text-slate-400 hover:text-slate-100'
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
              <h2 id="enroll-learner-title" className="text-lg font-bold text-slate-100">
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
                  className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold text-sm cursor-pointer"
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
