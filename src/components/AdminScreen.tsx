import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  Users,
  Building2,
  Database,
  RefreshCw,
  Download,
  AlertTriangle,
  Plus,
  Search,
  Check,
  Copy,
  Activity,
  Compass,
  Radio,
  Clock,
  Terminal,
  MapPin,
  Wifi,
} from 'lucide-react';
import {
  ClassSession,
  ScanEventLog,
  AdminSystemConfig,
} from '../types/attendance';
import { playFeedbackTone } from '../data/mockInstitution';

interface AdminScreenProps {
  sessions: ClassSession[];
  scanLogs: ScanEventLog[];
  adminConfig: AdminSystemConfig;
  onUpdateAdminConfig: (
    updater: AdminSystemConfig | ((prev: AdminSystemConfig) => AdminSystemConfig)
  ) => void;
  onClearLogs: () => void;
  onSimulateSecurityBreach: () => void;
  onResetDemoData: () => void;
  onExportFullBackup: () => void;
}

interface InstructorAccount {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'SUPERADMIN' | 'COORDINADOR' | 'INSTRUCTOR';
  status: 'ACTIVO' | 'SUSPENDIDO';
}

interface CampusVenue {
  id: string;
  name: string;
  campus: string;
  roomCode: string;
  geofenceRadius: number;
  activeCohorts: number;
}

const DEFAULT_INSTRUCTORS: InstructorAccount[] = [
  { id: 'inst-01', name: 'Ing. Mateo Restrepo', email: 'm.restrepo@politecnico.edu', department: 'Mecatrónica y Automatización', role: 'INSTRUCTOR', status: 'ACTIVO' },
  { id: 'inst-02', name: 'Inst. Carolina Suárez', email: 'c.suarez@politecnico.edu', department: 'Fabricación Mecánica', role: 'INSTRUCTOR', status: 'ACTIVO' },
  { id: 'inst-03', name: 'Ing. Ricardo Mendoza', email: 'r.mendoza@politecnico.edu', department: 'Sistemas Eléctricos', role: 'COORDINADOR', status: 'ACTIVO' },
  { id: 'inst-04', name: 'Inst. Diana Marcela Pardo', email: 'd.pardo@politecnico.edu', department: 'Telecomunicaciones', role: 'INSTRUCTOR', status: 'ACTIVO' },
  { id: 'inst-05', name: 'Dr. Hernando Caldas', email: 'h.caldas@politecnico.edu', department: 'Auditoría Académica y Control', role: 'SUPERADMIN', status: 'ACTIVO' },
];

const INSTRUCTORS_STORAGE_KEY = 'acadeqr_instructors_v1';

export const AdminScreen: React.FC<AdminScreenProps> = ({
  sessions,
  scanLogs,
  adminConfig: config,
  onUpdateAdminConfig: setConfig,
  onClearLogs,
  onSimulateSecurityBreach,
  onResetDemoData,
  onExportFullBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'SECURITY' | 'STAFF' | 'VENUES'>('AUDIT');
  const [logFilter, setLogFilter] = useState<'ALL' | 'DENIED' | 'LATE' | 'VERIFIED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [instructors, setInstructors] = useState<InstructorAccount[]>(() => {
    try {
      const raw = localStorage.getItem(INSTRUCTORS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as InstructorAccount[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_INSTRUCTORS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(INSTRUCTORS_STORAGE_KEY, JSON.stringify(instructors));
    } catch {
      // Ignore storage quota
    }
  }, [instructors]);

  const [venues] = useState<CampusVenue[]>([
    { id: 'ven-01', name: 'Laboratorio de Neumática y Robótica', campus: 'Sede Técnica Norte', roomCode: 'Taller B-204', geofenceRadius: 50, activeCohorts: 2 },
    { id: 'ven-02', name: 'Bahía de Mecanizado y Torno CNC', campus: 'Sede Técnica Norte', roomCode: 'Bahía CNC C-102', geofenceRadius: 40, activeCohorts: 1 },
    { id: 'ven-03', name: 'Taller de Alta Tensión y Transformadores', campus: 'Politécnico Central', roomCode: 'Laboratorio A-108', geofenceRadius: 60, activeCohorts: 1 },
    { id: 'ven-04', name: 'Laboratorio de Fibra Óptica y Enlaces', campus: 'Sede Técnica Norte', roomCode: 'Telecom D-301', geofenceRadius: 50, activeCohorts: 1 },
  ]);

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('Mecatrónica y Automatización');
  const [newStaffRole, setNewStaffRole] = useState<'INSTRUCTOR' | 'COORDINADOR'>('INSTRUCTOR');

  const filteredLogs = useMemo(() => {
    return scanLogs.filter((log) => {
      const matchesFilter = logFilter === 'ALL' || log.outcome === logFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.learnerName.toLowerCase().includes(q) ||
        log.nationalId.toLowerCase().includes(q) ||
        log.sessionId.toLowerCase().includes(q) ||
        log.tokenUsed.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [scanLogs, logFilter, searchQuery]);

  const totalDenials = scanLogs.filter((l) => l.outcome === 'DENIED').length;
  const totalVerified = scanLogs.filter((l) => l.outcome === 'VERIFIED').length;
  const totalLate = scanLogs.filter((l) => l.outcome === 'LATE').length;

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;

    const newStaff: InstructorAccount = {
      id: `inst-${Date.now().toString().slice(-4)}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      department: newStaffDept.trim(),
      role: newStaffRole,
      status: 'ACTIVO',
    };

    setInstructors((prev) => [newStaff, ...prev]);
    setNewStaffName('');
    setNewStaffEmail('');
    setIsAddStaffOpen(false);
    playFeedbackTone(true);
  };

  const handleRotateSecretKey = () => {
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0');
    setConfig((prev) => ({
      ...prev,
      hmacSecretKeyMasked: `••••••••••••••••••••••••••••••••${randomHex}`,
    }));
    playFeedbackTone(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ============================================================== */}
      {/* 1. TOP COMMAND BAR - ESTILO MISSION CONTROL LINEAR              */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              NÚCLEO ACTIVO
            </span>
            <span className="text-slate-500 font-mono text-[11px]">/</span>
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              Control de Acceso & Telemetría
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Consola de Administración Institucional</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Supervisión continua de autenticidad en tiempo real, verificación perimetral por geocerca y bitácora de asistencia.
          </p>
        </div>

        {/* Tactical Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSimulateSecurityBreach}
            className="h-8 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Simula un acceso anómalo con token inválido o fuera de rango"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Simular Incidente</span>
          </button>

          <button
            type="button"
            onClick={onExportFullBackup}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/40 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Respaldo JSON</span>
          </button>

          <button
            type="button"
            onClick={onResetDemoData}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. HUD METRIC TELEMETRY CARDS (4 PANELES CYBER CON CORCHETES)  */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping-slow" />
              TELEMETRÍA // 01
            </span>
            <span className="text-slate-400 text-[10px]">VERIFICADOS</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono-tabular tracking-tight">
              {totalVerified}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                99.4% ÉXITO
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-white/[0.06]">
            <span>Presencia confirmada</span>
            <span className="font-mono text-[11px] text-slate-300">QR Dinámico</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[11px] font-mono text-rose-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className="size-1.5 rounded-full bg-rose-400" />
              SEGURIDAD // 02
            </span>
            <span className="text-slate-400 text-[10px]">DENEGADOS</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold text-rose-300 font-mono-tabular tracking-tight">
              {totalDenials}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30">
                0 INTRUSIONES
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-white/[0.06]">
            <span>Tokens o geocerca inválidos</span>
            <span className="font-mono text-[11px] text-slate-300">Filtrado Activo</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className="size-1.5 rounded-full bg-amber-400" />
              PUNTUALIDAD // 03
            </span>
            <span className="text-slate-400 text-[10px]">TARDANZAS</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-300 font-mono-tabular tracking-tight">
              {totalLate}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                GRACIA 10M
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-white/[0.06]">
            <span>Fuera de margen inicial</span>
            <span className="font-mono text-[11px] text-slate-300">Registrado</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="cyber-panel cyber-bracket rounded-xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              COHORTES // 04
            </span>
            <span className="text-slate-400 text-[10px]">EN VIVO</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 font-mono-tabular tracking-tight">
              {sessions.length}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                XAMPP SQL
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-white/[0.06]">
            <span>Sedes sincronizadas</span>
            <span className="font-mono text-[11px] text-slate-300">Conectado</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SUB-NAV TABS - SEGMENTED LINEAR DOCK                       */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#080d18] border border-white/10 overflow-x-auto">
        {[
          { key: 'AUDIT', code: '01', label: 'Bitácora de Escaneos', icon: ShieldCheck },
          { key: 'SECURITY', code: '02', label: 'Criptografía & HMAC', icon: Key },
          { key: 'STAFF', code: '03', label: 'Docentes & Permisos', icon: Users },
          { key: 'VENUES', code: '04', label: 'Sedes & Geocercas', icon: Building2 },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`h-9 px-4 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                active
                  ? 'bg-slate-800 text-white font-semibold border border-white/15 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className={`font-mono text-[10px] ${active ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                [{tab.code}]
              </span>
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 4. TAB 01: BITÁCORA TÁCTICA DE ESCANEOS (DATA GRID FUTURISTA)   */}
      {/* ============================================================== */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          {/* Controls toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-[#090d18] border border-white/[0.07]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por estudiante, cédula, sesión o token..."
                className="w-full h-8 pl-9 pr-3 rounded-lg bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  { key: 'ALL', label: 'Todos', count: scanLogs.length },
                  { key: 'VERIFIED', label: 'Válidos', count: totalVerified },
                  { key: 'LATE', label: 'Tardanzas', count: totalLate },
                  { key: 'DENIED', label: 'Denegados', count: totalDenials },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setLogFilter(f.key)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer border ${
                    logFilter === f.key
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label} <span className="opacity-60 font-normal">[{f.count}]</span>
                </button>
              ))}

              <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={onClearLogs}
                className="h-7 px-2 text-[11px] font-mono text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Limpiar Bitácora
              </button>
            </div>
          </div>

          {/* Table / Grid */}
          {filteredLogs.length === 0 ? (
            <div className="cyber-panel rounded-xl p-12 text-center text-xs text-slate-400 space-y-2">
              <Terminal className="w-8 h-8 mx-auto text-slate-600" />
              <p className="font-mono text-slate-400">NO SE ENCONTRARON REGISTROS QUE COINCIDAN CON LOS CRITERIOS.</p>
              <p className="text-slate-500">Prueba ajustando el filtro o el término de búsqueda.</p>
            </div>
          ) : (
            <div className="cyber-panel rounded-xl overflow-hidden border border-white/[0.08]">
              {/* Desktop Table Header */}
              <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-white/[0.08] text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                <div className="col-span-1">Estado</div>
                <div className="col-span-3">Aprendiz / Documento</div>
                <div className="col-span-2">Sesión & Sede</div>
                <div className="col-span-2">Geocerca GPS</div>
                <div className="col-span-2">Token Criptográfico</div>
                <div className="col-span-2 text-right">Timestamp</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.05]">
                {filteredLogs.map((log) => {
                  const isVerified = log.outcome === 'VERIFIED';
                  const isLate = log.outcome === 'LATE';
                  const isDenied = log.outcome === 'DENIED';

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 lg:px-4 lg:py-3 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Estado */}
                      <div className="col-span-1 flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full shrink-0 ${
                            isVerified
                              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                              : isLate
                              ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                              : 'bg-rose-400 shadow-[0_0_8px_#f87171]'
                          }`}
                        />
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            isVerified
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : isLate
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {log.outcome}
                        </span>
                      </div>

                      {/* Aprendiz & Documento */}
                      <div className="col-span-3 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{log.learnerName}</div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{log.nationalId}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 truncate">{log.reason}</span>
                        </div>
                      </div>

                      {/* Sesión & Sede */}
                      <div className="col-span-2 font-mono text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[11px] border border-cyan-500/20 font-bold">
                          {log.sessionId}
                        </span>
                      </div>

                      {/* GPS Distance */}
                      <div className="col-span-2 flex items-center gap-2 text-xs font-mono">
                        <MapPin
                          className={`w-3.5 h-3.5 shrink-0 ${
                            log.distanceMeters <= 50 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        />
                        <span className="text-slate-200">{log.distanceMeters}m</span>
                        <span className="text-[10px] text-slate-500">/ 50m max</span>
                      </div>

                      {/* Token QR con botón de copia */}
                      <div className="col-span-2 flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="truncate max-w-[130px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-white/[0.08]">
                          {log.tokenUsed}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(log.tokenUsed)}
                          title="Copiar token criptográfico"
                          className="size-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedToken === log.tokenUsed ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Timestamp */}
                      <div className="col-span-2 text-right font-mono text-xs text-slate-400 flex items-center justify-end gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* RADAR DE TELEMETRÍA Y COORDENADAS GPS (WIDGET HUD FUTURISTA)    */}
          {/* ============================================================== */}
          <div className="cyber-panel rounded-xl p-4 sm:p-5 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Radar circular interactivo */}
              <div className="flex items-center gap-4">
                <div className="relative size-24 sm:size-28 rounded-full border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-center shrink-0">
                  {/* Concentric rings */}
                  <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
                  <div className="absolute inset-5 rounded-full border border-emerald-500/30" />
                  <div className="absolute inset-8 rounded-full border border-emerald-500/40" />

                  {/* Crosshairs */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-500/30" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500/30" />

                  {/* Sweeping laser radar beam */}
                  <div className="absolute inset-0 rounded-full animate-radar pointer-events-none">
                    <div className="w-1/2 h-1/2 bg-gradient-to-br from-emerald-400/40 via-emerald-400/10 to-transparent origin-bottom-right rounded-tl-full" />
                  </div>

                  {/* Beacon blips */}
                  <span className="absolute top-6 right-7 size-1.5 rounded-full bg-emerald-400 animate-ping-slow" />
                  <span className="absolute bottom-8 left-6 size-1.5 rounded-full bg-cyan-400 animate-ping-slow" />
                  <span className="absolute center size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                      Radar de Presencia GPS y Antenas
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Triangulación en vivo de coordenadas sobre 4 sedes formativas. Precisión perimetral calibrada en radio de 50 metros.
                  </p>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-emerald-400 mt-2">
                    <span>LAT 6.2442° N</span>
                    <span className="text-slate-600">·</span>
                    <span>LONG 75.5812° W</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-300">PING 8ms</span>
                  </div>
                </div>
              </div>

              {/* Server Engine Status Readouts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/[0.07] font-mono text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Motor REST</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">FastAPI Python</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/[0.07] font-mono text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Base de Datos</div>
                  <div className="text-xs font-bold text-cyan-400 mt-0.5">MySQL XAMPP</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/[0.07] font-mono text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-500 uppercase">Cifrado Token</div>
                  <div className="text-xs font-bold text-white mt-0.5">HMAC SHA-256</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. TAB 02: SEGURIDAD CRIPTOGRÁFICA Y PARÁMETROS HMAC            */}
      {/* ============================================================== */}
      {activeTab === 'SECURITY' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="cyber-panel rounded-xl p-5 sm:p-6 space-y-4 border border-white/[0.08]">
            <div className="border-b border-white/[0.08] pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>Motor de Firma Criptográfica</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generación y validación de tokens rotativos dinámicos.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                ACTIVO
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Algoritmo de Firma</label>
                <input
                  type="text"
                  disabled
                  value={config.cryptoAlgorithm}
                  className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-emerald-400 opacity-90 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Llave Secreta HMAC (Enmascarada)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled
                    value={config.hmacSecretKeyMasked}
                    className="flex-1 h-9 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-slate-300 opacity-90 cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={handleRotateSecretKey}
                    className="h-9 px-3.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium cursor-pointer whitespace-nowrap transition-colors"
                  >
                    Rotar Clave
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">TTL de Rotación</label>
                  <select
                    value={config.defaultTtlSeconds}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, defaultTtlSeconds: Number(e.target.value) }))
                    }
                    className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white"
                  >
                    <option value={15} className="bg-slate-900">15 segundos</option>
                    <option value={20} className="bg-slate-900">20 segundos</option>
                    <option value={30} className="bg-slate-900">30 segundos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Radio Máximo Geocerca</label>
                  <select
                    value={config.maxGeofenceMeters}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, maxGeofenceMeters: Number(e.target.value) }))
                    }
                    className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white"
                  >
                    <option value={40} className="bg-slate-900">40 metros</option>
                    <option value={50} className="bg-slate-900">50 metros</option>
                    <option value={60} className="bg-slate-900">60 metros</option>
                    <option value={100} className="bg-slate-900">100 metros</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="cyber-panel rounded-xl p-5 sm:p-6 space-y-4 border border-white/[0.08]">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Directivas de Integridad & Geocerca</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Políticas de acceso institucional y control anti-fraude.
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="p-3.5 rounded-lg bg-slate-900/60 border border-white/[0.07] flex items-start gap-3 cursor-pointer hover:border-emerald-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={config.strictGeofenceEnforced}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, strictGeofenceEnforced: e.target.checked }))
                  }
                  className="size-4 rounded accent-emerald-500 mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-white">Modo Estricto de Geocerca GPS</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Bloquea registros fuera del radio autorizado del aula física.
                  </p>
                </div>
              </label>

              <label className="p-3.5 rounded-lg bg-slate-900/60 border border-white/[0.07] flex items-start gap-3 cursor-pointer hover:border-emerald-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={config.allowManualOverride}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, allowManualOverride: e.target.checked }))
                  }
                  className="size-4 rounded accent-emerald-500 mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-white">Anulación Manual por Docente</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Permite autorizar presencia mediante comprobación visual en aula.
                  </p>
                </div>
              </label>

              <label className="p-3.5 rounded-lg bg-slate-900/60 border border-white/[0.07] flex items-start gap-3 cursor-pointer hover:border-emerald-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={config.tamperProtectionActive}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, tamperProtectionActive: e.target.checked }))
                  }
                  className="size-4 rounded accent-emerald-500 mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-white">Protección Anti-Suplantación (Anti-Replay)</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Descarta capturas de pantalla o fotografías del QR tras el tiempo de caducidad.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. TAB 03: DOCENTES Y MATRIZ DE PERMISOS RBAC                  */}
      {/* ============================================================== */}
      {activeTab === 'STAFF' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#090d18] border border-white/[0.07]">
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Directorio de Docentes e Instructores
              </h2>
              <p className="text-xs text-slate-400">Roles y control de acceso RBAC por departamento</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddStaffOpen(true)}
              className="h-8 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Docente</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {instructors.map((inst) => (
              <div
                key={inst.id}
                className="cyber-panel rounded-xl p-4 space-y-3 border border-white/[0.08]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs text-emerald-300">
                      {inst.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{inst.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
                        {inst.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-2.5 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                    {inst.department}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                      inst.role === 'SUPERADMIN'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : inst.role === 'COORDINADOR'
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                        : 'bg-slate-800 border-white/10 text-slate-300'
                    }`}
                  >
                    {inst.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. TAB 04: INFRAESTRUCTURA, SEDES Y GEOCERCAS                  */}
      {/* ============================================================== */}
      {activeTab === 'VENUES' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {venues.map((venue) => (
            <article key={venue.id} className="cyber-panel rounded-xl p-5 space-y-3 border border-white/[0.08]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    {venue.campus}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">{venue.name}</h3>
                </div>
                <span className="rounded-md bg-slate-900 border border-white/10 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300">
                  {venue.roomCode}
                </span>
              </div>

              <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Radio Geocerca: {venue.geofenceRadius}m</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {venue.activeCohorts} cohorte(s)
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL PARA ACREDITAR NUEVO DOCENTE                          */}
      {/* ============================================================== */}
      {isAddStaffOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="cyber-panel rounded-2xl w-full max-w-md p-6 space-y-4 border border-emerald-500/30 shadow-2xl shadow-black/90">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Acreditar Nuevo Docente</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Ej. Ing. Laura Gómez Vallejo"
                  className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Correo Institucional</label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="l.gomez@politecnico.edu"
                  className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Departamento</label>
                  <input
                    type="text"
                    required
                    value={newStaffDept}
                    onChange={(e) => setNewStaffDept(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Rol RBAC</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as 'INSTRUCTOR' | 'COORDINADOR')}
                    className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white"
                  >
                    <option value="INSTRUCTOR" className="bg-slate-900">Instructor</option>
                    <option value="COORDINADOR" className="bg-slate-900">Coordinador</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="h-9 px-3.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
                >
                  Guardar Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
