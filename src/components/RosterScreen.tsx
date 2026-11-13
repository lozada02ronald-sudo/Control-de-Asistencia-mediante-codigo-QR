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
}

export const RosterScreen: React.FC<RosterScreenProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  onSetLearnerStatus,
  onAddLearner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
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
    const q = searchQuery.trim().toLowerCase();
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
  }, [activeSession, searchQuery, statusFilter]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newNationalId.trim()) return;
    const colors = ['#006948', '#0051d5', '#0f172a', '#8d4b00'];
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
          <p className="text-xs font-semibold text-[#006948] tracking-wide mb-1">
            Cohort Verification &amp; Audit Ledger
          </p>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#131b2e] leading-tight">
            Cohort Attendance Roster
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Select cohort roster"
            value={activeSession.id}
            onChange={(e) => onSelectSession(e.target.value)}
            className="institutional-input text-sm font-semibold text-[#131b2e] min-w-[240px]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.cohortCode} — {s.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4999] hover:bg-[#dbeafe] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll Learner</span>
          </button>

          <button
            type="button"
            onClick={() => downloadAttendanceCsv(activeSession)}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#059669] hover:bg-[#006948] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Cohort Summary Strip */}
      <div className="surface-level-1 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#3d4a42]">
            {activeSession.cohortCode} · {activeSession.room} · {activeSession.instructor}
          </div>
          <div className="text-lg font-bold text-[#131b2e] mt-0.5">
            {activeSession.title}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm tabular-nums-strict">
          <div>
            <span className="text-xs text-[#6d7a72] block">Present</span>
            <span className="font-bold text-[#006948] text-lg">{counts.present}</span>
          </div>
          <div>
            <span className="text-xs text-[#6d7a72] block">Late Grace</span>
            <span className="font-bold text-[#8d4b00] text-lg">{counts.late}</span>
          </div>
          <div>
            <span className="text-xs text-[#6d7a72] block">Absent</span>
            <span className="font-bold text-[#ba1a1a] text-lg">{counts.absent}</span>
          </div>
          <div>
            <span className="text-xs text-[#6d7a72] block">Enrolled</span>
            <span className="font-bold text-[#131b2e] text-lg">{counts.total}</span>
          </div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#6d7a72] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by learner name or National ID..."
            aria-label="Filter learners"
            className="institutional-input w-full pl-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#eaedff] rounded-xl overflow-x-auto">
          {(
            [
              { key: 'ALL', label: `All (${counts.total})` },
              { key: AttendanceStatus.PRESENT, label: `Present (${counts.present})` },
              { key: AttendanceStatus.LATE, label: `Late (${counts.late})` },
              { key: AttendanceStatus.ABSENT, label: `Absent (${counts.absent})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                statusFilter === tab.key
                  ? 'bg-white text-[#131b2e] shadow-sm'
                  : 'text-[#3d4a42] hover:text-[#131b2e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Separated Card-Row List */}
      {filteredRows.length === 0 ? (
        <div className="surface-level-1 rounded-2xl p-10 text-center">
          <p className="text-base font-semibold text-[#131b2e]">No learners match this filter</p>
          <p className="text-sm text-[#3d4a42] mt-1">
            Adjust the search term or select a different status tab.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRows.map(({ learner, status, record }) => (
            <div
              key={learner.id}
              className="surface-level-1 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* Left: Initials Avatar + Learner Name & National ID */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: learner.avatarColor }}
                  aria-hidden="true"
                >
                  {getInitials(learner.fullName)}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#131b2e] truncate">
                    {learner.fullName}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#3d4a42] mt-0.5">
                    <span className="font-mono-tabular font-medium text-[#131b2e]">
                      {learner.nationalId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{record?.method ?? 'Not Checked In'}</span>
                    {record?.distanceMeters !== null && record?.distanceMeters !== undefined && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular">
                          <MapPin className="w-3 h-3 text-[#059669]" />
                          {record.distanceMeters}m
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Timestamp + Status Pill + Instant Toggle */}
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
                <div className="flex items-center gap-2.5">
                  {record?.checkedInAt && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono-tabular font-semibold text-[#3d4a42]">
                      <Clock className="w-3.5 h-3.5 text-[#6d7a72]" />
                      {record.checkedInAt}
                    </span>
                  )}
                  <AttendanceStatusBadge status={status} />
                </div>

                {/* Instant Instructor Status Toggle */}
                <div
                  className="inline-flex items-center p-0.5 rounded-lg bg-[#f1f5f9] border border-slate-200/80"
                  role="group"
                  aria-label={`Set attendance status for ${learner.fullName}`}
                >
                  {(
                    [
                      { key: AttendanceStatus.PRESENT, label: 'P', title: 'Mark Present' },
                      { key: AttendanceStatus.LATE, label: 'L', title: 'Mark Late' },
                      { key: AttendanceStatus.ABSENT, label: 'A', title: 'Mark Absent' },
                    ] as const
                  ).map((opt) => {
                    const isActive = status === opt.key;
                    let activeStyle = '';
                    if (isActive && opt.key === AttendanceStatus.PRESENT) {
                      activeStyle = 'bg-[#059669] text-white';
                    } else if (isActive && opt.key === AttendanceStatus.LATE) {
                      activeStyle = 'bg-[#d97706] text-white';
                    } else if (isActive && opt.key === AttendanceStatus.ABSENT) {
                      activeStyle = 'bg-[#e11d48] text-white';
                    }
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        title={opt.title}
                        onClick={() => onSetLearnerStatus(activeSession.id, learner.id, opt.key)}
                        className={`w-9 h-9 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                          isActive ? activeStyle : 'text-[#334155] hover:bg-white'
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enroll-learner-title"
        >
          <div className="surface-level-2 rounded-3xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="enroll-learner-title" className="text-lg font-bold text-[#131b2e]">
                Enroll Learner to {activeSession.cohortCode}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close modal"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#334155] hover:bg-[#f1f5f9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Natalia Ortiz Castaño"
                  className="institutional-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                  National ID Document
                </label>
                <input
                  type="text"
                  required
                  value={newNationalId}
                  onChange={(e) => setNewNationalId(e.target.value)}
                  placeholder="e.g. CC 1.095.442.190"
                  className="institutional-input w-full text-sm font-mono-tabular"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-11 px-4 rounded-xl text-sm font-semibold text-[#334155] hover:bg-[#f1f5f9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-[#059669] hover:bg-[#006948] text-white text-sm font-semibold cursor-pointer"
                >
                  Add to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
