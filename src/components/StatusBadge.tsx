import React from 'react';
import { AttendanceStatus, SessionStatus } from '../types/attendance';

export const SessionStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
  if (status === SessionStatus.LIVE) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
        En Vivo
      </span>
    );
  }
  if (status === SessionStatus.SCHEDULED) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">
        <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
        Programada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700/50 border border-slate-600/40 px-3 py-1 text-xs font-semibold text-slate-300">
      <span className="w-2 h-2 rounded-full bg-slate-400" aria-hidden="true" />
      Finalizada
    </span>
  );
};

export const AttendanceStatusBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
  if (status === AttendanceStatus.PRESENT) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 text-xs font-semibold text-emerald-300">
        Presente
      </span>
    );
  }
  if (status === AttendanceStatus.LATE) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 text-xs font-semibold text-amber-300">
        Tardanza
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-400/30 px-2.5 py-1 text-xs font-semibold text-rose-300">
      Ausente
    </span>
  );
};
