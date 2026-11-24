import React from 'react';
import { AttendanceStatus, SessionStatus } from '../types/attendance';

export const SessionStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
  if (status === SessionStatus.LIVE) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-mono font-bold text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" aria-hidden="true" />
        EN VIVO
      </span>
    );
  }
  if (status === SessionStatus.SCHEDULED) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" aria-hidden="true" />
        PROGRAMADA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800/80 border border-white/10 px-2.5 py-0.5 text-[11px] font-mono font-bold text-slate-300">
      <span className="size-1.5 rounded-full bg-slate-500" aria-hidden="true" />
      FINALIZADA
    </span>
  );
};

export const AttendanceStatusBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
  if (status === AttendanceStatus.PRESENT) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        PRESENTE
      </span>
    );
  }
  if (status === AttendanceStatus.LATE) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
        TARDANZA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300">
      <span className="size-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f87171]" />
      AUSENTE
    </span>
  );
};
