import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  ClassSession,
  ScanEventLog,
} from '../types/attendance';
import type { AuthUserSession } from './AuthPortalScreen';

interface LearnerAttendanceScreenProps {
  currentUser: AuthUserSession;
  sessions: ClassSession[];
  scanLogs: ScanEventLog[];
  onGoToScanner: () => void;
}

const DAILY_ROSTER_KEY = 'acadeqr_daily_roster_v1';
type DailyRosterMap = Record<string, Record<string, Record<string, AttendanceRecord>>>;

function getLocalIsoDate(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatIsoToDigital(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface LearnerDailyEntry {
  key: string;
  isoDate: string;
  dateText: string;
  timeText: string;
  session: ClassSession;
  record?: AttendanceRecord;
  status: AttendanceStatus;
}

export const LearnerAttendanceScreen: React.FC<LearnerAttendanceScreenProps> = ({
  currentUser,
  sessions,
  scanLogs,
  onGoToScanner,
}) => {
  const todayIso = useMemo(() => getLocalIsoDate(), []);
  const [filter, setFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [calendarMode, setCalendarMode] = useState<'year' | 'month'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
  const [dailyRoster, setDailyRoster] = useState<DailyRosterMap>(() => {
    try {
      const raw = localStorage.getItem(DAILY_ROSTER_KEY);
      if (raw) return JSON.parse(raw) as DailyRosterMap;
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    const syncDaily = (e: StorageEvent) => {
      if (e.key === DAILY_ROSTER_KEY && e.newValue) {
        try {
          setDailyRoster(JSON.parse(e.newValue) as DailyRosterMap);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', syncDaily);
    return () => window.removeEventListener('storage', syncDaily);
  }, []);

  const allEntries = useMemo<LearnerDailyEntry[]>(() => {
    const userNameLower = currentUser.name.trim().toLowerCase();
    const userDocLower = (currentUser.nationalId ?? '').trim().toLowerCase();
    const entries: LearnerDailyEntry[] = [];

    sessions.forEach((session) => {
      const learner = session.learners.find(
        (l) =>
          l.id === currentUser.id ||
          (userDocLower && l.nationalId.trim().toLowerCase() === userDocLower) ||
          l.fullName.trim().toLowerCase() === userNameLower
      );
      if (!learner) return;

      // Today's live record
      const todayRecord = session.records.find((r) => r.learnerId === learner.id);
      const todayStatus = todayRecord?.status ?? AttendanceStatus.ABSENT;
      entries.push({
        key: `${session.id}-${todayIso}`,
        isoDate: todayIso,
        dateText: todayRecord?.checkedInDate || formatIsoToDigital(todayIso),
        timeText: todayRecord?.checkedInAt || 'Sin registro',
        session,
        record: todayRecord,
        status: todayStatus,
      });

      // Historical / calendar-marked records across all years & months
      const sessionDays = dailyRoster[session.id] ?? {};
      Object.entries(sessionDays).forEach(([isoDate, learnersMap]) => {
        if (isoDate === todayIso) return;
        const rec = learnersMap[learner.id];
        if (!rec) return;
        entries.push({
          key: `${session.id}-${isoDate}`,
          isoDate,
          dateText: rec.checkedInDate || formatIsoToDigital(isoDate),
          timeText: rec.checkedInAt || 'Sin registro',
          session,
          record: rec,
          status: rec.status,
        });
      });
    });

    return entries.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  }, [sessions, currentUser, dailyRoster, todayIso]);

  const counts = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    allEntries.forEach((r) => {
      if (r.status === AttendanceStatus.PRESENT) present += 1;
      else if (r.status === AttendanceStatus.LATE) late += 1;
      else absent += 1;
    });
    const total = allEntries.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      const matchesStatus = filter === 'ALL' || entry.status === filter;
      const matchesDay = !selectedDayIso || entry.isoDate === selectedDayIso;
      return matchesStatus && matchesDay;
    });
  }, [allEntries, filter, selectedDayIso]);

  const statusByIso = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    allEntries.forEach((e) => {
      const prev = map[e.isoDate];
      if (!prev || e.status === AttendanceStatus.ABSENT) {
        map[e.isoDate] = e.status;
      }
    });
    return map;
  }, [allEntries]);

  const myLogs = useMemo(() => {
    const userNameLower = currentUser.name.trim().toLowerCase();
    const userDocLower = (currentUser.nationalId ?? '').trim().toLowerCase();
    return scanLogs.filter(
      (log) =>
        log.learnerName.trim().toLowerCase() === userNameLower ||
        (userDocLower && log.nationalId.trim().toLowerCase() === userDocLower)
    );
  }, [scanLogs, currentUser]);

  const yearsList = Array.from({ length: 12 }, (_, idx) => 2024 + idx);

  const renderMonthCard = (monthIdx: number, compact: boolean) => {
    const firstDay = new Date(selectedYear, monthIdx, 1);
    const daysInMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const monthName = firstDay.toLocaleDateString('es-ES', { month: 'long' });
    const cells: (string | null)[] = [
      ...Array.from({ length: startWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, idx) =>
        getLocalIsoDate(new Date(selectedYear, monthIdx, idx + 1))
      ),
    ];

    return (
      <div
        key={monthIdx}
        className={
          compact
            ? 'rounded-2xl bg-slate-900/75 border border-slate-800 p-3 space-y-2'
            : 'space-y-3'
        }
      >
        <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 capitalize">
          {monthName} {selectedYear}
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
            if (!iso) return <div key={`empty-${monthIdx}-${i}`} />;
            const dayNum = Number(iso.split('-')[2]);
            const st = statusByIso[iso];
            const isSelected = selectedDayIso === iso;

            let colorStyle =
              'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:border-slate-600';
            let statusShort: string | null = null;
            let statusFull: string | null = null;
            if (st === AttendanceStatus.PRESENT) {
              colorStyle =
                'bg-emerald-500/25 border border-emerald-400/60 text-emerald-100 font-bold';
              statusShort = 'A';
              statusFull = 'Asistió';
            } else if (st === AttendanceStatus.LATE) {
              colorStyle =
                'bg-amber-500/25 border border-amber-400/60 text-amber-100 font-bold';
              statusShort = 'R';
              statusFull = 'Retardo';
            } else if (st === AttendanceStatus.ABSENT) {
              colorStyle =
                'bg-rose-500/25 border border-rose-400/60 text-rose-100 font-bold';
              statusShort = 'F';
              statusFull = 'Falla';
            }

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDayIso((cur) => (cur === iso ? null : iso))}
                title={`${formatIsoToDigital(iso)}${statusFull ? ` · ${statusFull}` : ''}`}
                className={`${
                  compact ? 'h-9 text-[11px]' : 'h-12 text-xs'
                } rounded-lg font-mono-tabular flex flex-col items-center justify-center leading-tight transition-all cursor-pointer ${colorStyle} ${
                  isSelected ? 'ring-2 ring-cyan-400' : ''
                }`}
              >
                <span>{dayNum}</span>
                {statusShort && (
                  <span className={compact ? 'text-[9px] uppercase' : 'text-[10px]'}>
                    {compact ? statusShort : statusFull}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Registro Personal Verificado
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            Mis Asistencias y Fallas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Aprendiz: <strong className="text-white">{currentUser.name}</strong>
            {currentUser.nationalId ? ` · ${currentUser.nationalId}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToScanner}
          className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Ir a Escanear QR</span>
        </button>
      </div>

      {/* Personal Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Asistencias (Presente)</div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono-tabular">
            {counts.present}
          </div>
          <p className="text-[11px] text-slate-500">Verificadas con fecha y hora</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Retardos (Tardanza)</div>
          <div className="text-3xl font-extrabold text-amber-300 font-mono-tabular">
            {counts.late}
          </div>
          <p className="text-[11px] text-slate-500">Fuera del margen de gracia</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Fallas (Ausente)</div>
          <div className="text-3xl font-extrabold text-rose-400 font-mono-tabular">
            {counts.absent}
          </div>
          <p className="text-[11px] text-slate-500">Sin registro en sesión</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Cumplimiento</div>
          <div className="text-3xl font-extrabold text-white font-mono-tabular">
            {counts.rate}%
          </div>
          <p className="text-[11px] text-slate-500">{counts.total} registro(s) totales</p>
        </div>
      </div>

      {/* Personal Calendar across all months & years */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Mi Calendario de Asistencias, Retardos y Fallas
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 mt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60 border border-emerald-400" />
                  Asistió (A)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/60 border border-amber-400" />
                  Retardo (R)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/60 border border-rose-400" />
                  Falla (F)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Seleccionar año"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="modern-input h-9 text-xs font-mono-tabular font-bold px-2.5"
            >
              {yearsList.map((yr) => (
                <option key={yr} value={yr} className="bg-slate-900">
                  Año {yr}
                </option>
              ))}
            </select>

            {calendarMode === 'month' && (
              <select
                aria-label="Seleccionar mes"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="modern-input h-9 text-xs font-semibold px-2.5 capitalize"
              >
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={idx} value={idx} className="bg-slate-900 capitalize">
                    {new Date(selectedYear, idx, 1).toLocaleDateString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setCalendarMode((m) => (m === 'month' ? 'year' : 'month'))}
              className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              {calendarMode === 'month' ? 'Ver 12 Meses' : 'Ver 1 Mes'}
            </button>

            {selectedDayIso && (
              <button
                type="button"
                onClick={() => setSelectedDayIso(null)}
                className="h-9 px-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-semibold cursor-pointer"
              >
                Día: {formatIsoToDigital(selectedDayIso)} ×
              </button>
            )}
          </div>
        </div>

        {calendarMode === 'year' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            {Array.from({ length: 12 }, (_, idx) => renderMonthCard(idx, true))}
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-800">
            {renderMonthCard(selectedMonth, false)}
          </div>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'ALL', label: `Todos (${counts.total})` },
            { key: AttendanceStatus.PRESENT, label: `Asistencias (${counts.present})` },
            { key: AttendanceStatus.LATE, label: `Retardos (${counts.late})` },
            { key: AttendanceStatus.ABSENT, label: `Fallas (${counts.absent})` },
          ] as const
        ).map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Detailed Records */}
      {filteredEntries.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-300">
            {allEntries.length === 0
              ? 'Aún no estás inscrito en ningún programa de estudio.'
              : 'No hay registros para la fecha o filtro seleccionado.'}
          </p>
          {allEntries.length === 0 && (
            <button
              type="button"
              onClick={onGoToScanner}
              className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Inscribirme en una Sede / Programa
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(({ key, session, record, status, dateText, timeText }) => (
            <div
              key={key}
              className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono-tabular font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-lg">
                    {session.cohortCode}
                  </span>
                  <h2 className="text-base font-bold text-white truncate">{session.title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {session.campus} · {session.room}
                  </span>
                  <span>Docente: {session.instructor}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                {/* Exact Digital Date (Day/Month/Year) & Time (HH:MM:SS) */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs font-mono-tabular space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Fecha Digital: {dateText}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hora y Minutos: {timeText}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      status === AttendanceStatus.PRESENT
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                        : status === AttendanceStatus.LATE
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                    }`}
                  >
                    {status === AttendanceStatus.PRESENT ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : status === AttendanceStatus.LATE ? (
                      <TriangleAlert className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {status === AttendanceStatus.PRESENT
                        ? 'Asistió (Presente)'
                        : status === AttendanceStatus.LATE
                        ? 'Retardo (Tardanza)'
                        : 'Falla (Ausente)'}
                    </span>
                  </span>

                  {record?.tokenSignature && (
                    <span className="text-[10px] font-mono-tabular text-slate-400 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      {record.tokenSignature} · {record.method}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Personal Scan Audit History */}
      {myLogs.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Historial Cronológico de Mis Escaneos
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {myLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-900/75 border border-slate-800 px-3.5 py-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200">{log.reason}</div>
                  <div className="text-[11px] font-mono-tabular text-slate-400">
                    Token: {log.tokenUsed} · Distancia: {log.distanceMeters}m
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
                  <span className="text-[11px] text-slate-300">
                    {log.dateLabel ? `${log.dateLabel} · ` : ''}
                    {log.timestamp}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.outcome === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : log.outcome === 'LATE'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {log.outcome}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
