import React from 'react';
import { CheckCircle2, Clock, Radio, XCircle, Calendar } from 'lucide-react';
import { AttendanceStatus, SessionStatus } from '../types/attendance';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
}

export const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({ status }) => {
  if (status === AttendanceStatus.PRESENT) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d1fae5] px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-[#065f46] whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Verified Present</span>
      </span>
    );
  }

  if (status === AttendanceStatus.LATE) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-[#92400e] whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Late Grace</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe4e6] px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-[#9f1239] whitespace-nowrap shrink-0">
      <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Absent</span>
    </span>
  );
};

interface SessionStatusBadgeProps {
  status: SessionStatus;
}

export const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ status }) => {
  if (status === SessionStatus.LIVE) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d1fae5] px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-[#065f46] whitespace-nowrap shrink-0">
        <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Live Check-In</span>
      </span>
    );
  }

  if (status === SessionStatus.SCHEDULED) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dbeafe] px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-[#1e40af] whitespace-nowrap shrink-0">
        <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Scheduled</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f5f9] px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-[#334155] whitespace-nowrap shrink-0">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Completed</span>
    </span>
  );
};
