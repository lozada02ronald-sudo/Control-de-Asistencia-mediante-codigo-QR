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
  CheckCircle2,
} from 'lucide-react';
import {
  AttendanceStatus,
  CheckInMethod,
  ClassSession,
  SessionStatus,
} from '../types/attendance';
import { SessionStatusBadge } from './StatusBadge';

interface OverviewScreenProps {
  sessions: ClassSession[];
  onSelectSessionForProjector: (sessionId: string) => void;
  onSelectSessionForScanner: (sessionId: string) => void;
  onSelectSessionForRoster: (sessionId: string) => void;
  onCreateSession: (newSession: ClassSession) => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  sessions,
  onSelectSessionForProjector,
  onSelectSessionForScanner,
  onSelectSessionForRoster,
  onCreateSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SessionStatus>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [cohortCode, setCohortCode] = useState('COH-5120');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Industrial Automation');
  const [instructor, setInstructor] = useState('');
  const [room, setRoom] = useState('');
  const [campus, setCampus] = useState('North Technical Campus');
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
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.cohortCode.toLowerCase().includes(q) ||
        s.instructor.toLowerCase().includes(q) ||
        s.room.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [sessions, statusFilter, searchQuery]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instructor.trim() || !room.trim()) return;

    const id = `ses-${Date.now().toString().slice(-4)}`;
    const defaultLearners = [
      { id: `${id}-l1`, fullName: 'Alejandro Torres Vega', nationalId: 'CC 1.049.210.334', program: department, avatarColor: '#006948' },
      { id: `${id}-l2`, fullName: 'Valeria Gómez Pardo', nationalId: 'CC 1.028.774.129', program: department, avatarColor: '#0051d5' },
      { id: `${id}-l3`, fullName: 'Samuel Ortiz Muñoz', nationalId: 'CC 1.091.452.880', program: department, avatarColor: '#0f172a' },
      { id: `${id}-l4`, fullName: 'Melissa Castro Rivera', nationalId: 'CC 1.076.118.540', program: department, avatarColor: '#8d4b00' },
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
      dateLabel: 'Today',
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
    <div className="space-y-6">
      {/* Page Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#006948] tracking-wide mb-1">
            Vocational &amp; Technical Academy · Daily Attendance Monitor
          </p>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#131b2e] leading-tight text-balance">
            Institutional Attendance Overview
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-[#059669] hover:bg-[#006948] active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Class Session</span>
        </button>
      </div>

      {/* Institutional Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="surface-level-1 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-[#3d4a42] mb-2">Total Attendance</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#006948] tabular-nums-strict tracking-tight">
              {summary.rate}%
            </span>
            <span className="text-xs font-medium text-[#3d4a42]">Asistencia Total</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[#e2e7ff] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#059669] transition-all duration-300"
              style={{ width: `${Math.min(100, summary.rate)}%` }}
            />
          </div>
        </div>

        <div className="surface-level-1 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-[#3d4a42] mb-2">Verified Learners</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#131b2e] tabular-nums-strict tracking-tight">
              {summary.verifiedTotal}
            </span>
            <span className="text-sm font-medium text-[#6d7a72] tabular-nums-strict">
              / {summary.totalLearners}
            </span>
          </div>
          <p className="mt-2.5 text-xs text-[#3d4a42] tabular-nums-strict">
            {summary.presentCount} on-time · {summary.lateCount} late grace
          </p>
        </div>

        <div className="surface-level-1 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-[#3d4a42] mb-2">Live QR Sessions</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0051d5] tabular-nums-strict tracking-tight">
              {summary.liveCount}
            </span>
            <span className="text-xs font-medium text-[#3d4a42]">active now</span>
          </div>
          <p className="mt-2.5 text-xs text-[#3d4a42]">
            Rotating 20s cryptographic tokens
          </p>
        </div>

        <div className="surface-level-1 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-[#3d4a42] mb-2">Geofence Enforcement</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#131b2e] tabular-nums-strict tracking-tight">
              50m
            </span>
            <span className="text-xs font-medium text-[#3d4a42]">max radius</span>
          </div>
          <p className="mt-2.5 text-xs text-[#3d4a42] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
            <span>Campus perimeter verified</span>
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#6d7a72] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cohort, course, instructor, or room..."
            aria-label="Search class sessions"
            className="institutional-input w-full pl-10 text-sm text-[#131b2e] placeholder:text-[#6d7a72]"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#eaedff] rounded-xl overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'All Sessions' },
              { key: SessionStatus.LIVE, label: 'Live' },
              { key: SessionStatus.SCHEDULED, label: 'Scheduled' },
              { key: SessionStatus.COMPLETED, label: 'Completed' },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#131b2e] shadow-sm'
                    : 'text-[#3d4a42] hover:text-[#131b2e]'
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
        <div className="surface-level-1 rounded-2xl p-10 text-center">
          <p className="text-base font-semibold text-[#131b2e] mb-1">
            No matching classroom sessions
          </p>
          <p className="text-sm text-[#3d4a42] mb-4">
            Try clearing your search query or switching the session status filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4999] text-sm font-semibold hover:bg-[#dbeafe] transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                className="surface-level-1 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-2 text-xs text-[#3d4a42] mb-1">
                        <span className="font-mono-tabular font-semibold text-[#0051d5]">
                          {session.cohortCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{session.department}</span>
                      </div>
                      <h2 className="text-lg font-semibold text-[#131b2e] leading-snug">
                        {session.title}
                      </h2>
                    </div>
                    <SessionStatusBadge status={session.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#3d4a42]">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#6d7a72]" />
                      {session.room} ({session.geofenceRadiusMeters}m radius)
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                      <Clock className="w-3.5 h-3.5 text-[#6d7a72]" />
                      {session.startTime}–{session.endTime}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#6d7a72]" />
                      {session.instructor}
                    </span>
                  </div>

                  {/* Attendance Progress */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#131b2e]">
                        Cohort Check-In Progress
                      </span>
                      <span className="font-mono-tabular font-semibold text-[#131b2e]">
                        {checkedIn}/{total} learners ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#f1f5f9] overflow-hidden flex">
                      {total > 0 && (
                        <>
                          <div
                            className="h-full bg-[#059669] transition-all duration-300"
                            style={{ width: `${(present / total) * 100}%` }}
                          />
                          <div
                            className="h-full bg-[#d97706] transition-all duration-300"
                            style={{ width: `${(late / total) * 100}%` }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectSessionForProjector(session.id)}
                    className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#059669] hover:bg-[#006948] active:scale-[0.98] text-white text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                  >
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>
                      {session.status === SessionStatus.LIVE ? 'Project Live QR' : 'Open QR Screen'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSessionForScanner(session.id)}
                    className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4999] hover:bg-[#dbeafe] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ScanLine className="w-4 h-4 shrink-0" />
                    <span>Scanner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSessionForRoster(session.id)}
                    className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-[#334155] hover:bg-[#f1f5f9] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Roster</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-session-title"
        >
          <div className="surface-level-2 rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="create-session-title" className="text-xl font-bold text-[#131b2e]">
                  Launch New Class Session
                </h2>
                <p className="text-xs text-[#3d4a42] mt-0.5">
                  Configure geofence radius and generate live rotating QR tokens
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[#334155] hover:bg-[#f1f5f9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                    Cohort Code
                  </label>
                  <input
                    type="text"
                    required
                    value={cohortCode}
                    onChange={(e) => setCohortCode(e.target.value)}
                    placeholder="e.g. COH-5120"
                    className="institutional-input w-full text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                    Department / Program
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Industrial Automation"
                    className="institutional-input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                  Session / Course Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pneumatic Circuits & Hydraulic Actuators"
                  className="institutional-input w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                    Lead Instructor
                  </label>
                  <input
                    type="text"
                    required
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="e.g. Eng. Sofía Navarro"
                    className="institutional-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                    Classroom / Workshop
                  </label>
                  <input
                    type="text"
                    required
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Lab E-104"
                    className="institutional-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="institutional-input w-full text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="institutional-input w-full text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                    Geofence (m)
                  </label>
                  <select
                    value={geofenceRadius}
                    onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                    className="institutional-input w-full text-sm font-mono-tabular"
                  >
                    <option value={25}>25m</option>
                    <option value={50}>50m</option>
                    <option value={100}>100m</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-4 rounded-xl text-sm font-semibold text-[#334155] hover:bg-[#f1f5f9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-12 px-5 rounded-xl bg-[#059669] hover:bg-[#006948] text-white text-sm font-semibold cursor-pointer"
                >
                  Activate Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
