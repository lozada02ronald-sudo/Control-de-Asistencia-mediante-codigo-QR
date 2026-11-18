import React, { useMemo, useState } from 'react';
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

export const LearnerAttendanceScreen: React.FC<LearnerAttendanceScreenProps> = ({
  currentUser,
  sessions,
  scanLogs,
  onGoToScanner,
}) => {
  const [filter, setFilter] = useState<'ALL' | AttendanceStatus>('ALL');

  const myRows = useMemo(() => {
    const userNameLower = currentUser.name.trim().toLowerCase();
    const userDocLower = (currentUser.nationalId ?? '').trim().toLowerCase();

    return sessions
      .map((session) => {
        const learner = session.learners.find(
          (l) =>
            l.id === currentUser.id ||
            (userDocLower && l.nationalId.trim().toLowerCase() === userDocLower) ||
            l.fullName.trim().toLowerCase() === userNameLower
        );
        if (!learner) return null;
        const record = session.records.find((r) => r.learnerId === learner.id);
        const status = record?.status ?? AttendanceStatus.ABSENT;
        return {
          session,
          learner,
          record,
          status,
          dateText: record?.checkedInDate || session.dateLabel,
          timeText: record?.checkedInAt || 'Sin registro',
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [sessions, currentUser]);

  const counts = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    myRows.forEach((r) => {
      if (r.status === AttendanceStatus.PRESENT) present += 1;
      else if (r.status === AttendanceStatus.LATE) late += 1;
      else absent += 1;
    });
    const total = myRows.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  }, [myRows]);

  const filteredRows = useMemo(() => {
    if (filter === 'ALL') return myRows;
    return myRows.filter((r) => r.status === filter);
  }, [myRows, filter]);

  const myLogs = useMemo(() => {
    const userNameLower = currentUser.name.trim().toLowerCase();
    const userDocLower = (currentUser.nationalId ?? '').trim().toLowerCase();
    return scanLogs.filter(
      (log) =>
        log.learnerName.trim().toLowerCase() === userNameLower ||
        (userDocLower && log.nationalId.trim().toLowerCase() === userDocLower)
    );
  }, [scanLogs, currentUser]);

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
          <div className="text-xs font-semibold text-slate-400">Tardanzas</div>
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
          <p className="text-[11px] text-slate-500">{counts.total} programa(s) inscrito(s)</p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'ALL', label: `Todos (${counts.total})` },
            { key: AttendanceStatus.PRESENT, label: `Asistencias (${counts.present})` },
            { key: AttendanceStatus.LATE, label: `Tardanzas (${counts.late})` },
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
      {filteredRows.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-300">
            {myRows.length === 0
              ? 'Aún no estás inscrito en ningún programa de estudio.'
              : 'No hay registros en esta categoría.'}
          </p>
          {myRows.length === 0 && (
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
          {filteredRows.map(({ session, record, status, dateText, timeText }) => (
            <div
              key={session.id}
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
                {/* Exact Date (Day/Month/Year) & Time (HH:MM:SS) */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs font-mono-tabular space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Fecha: {dateText}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hora: {timeText}</span>
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
                        ? 'Presente'
                        : status === AttendanceStatus.LATE
                        ? 'Tardanza'
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

