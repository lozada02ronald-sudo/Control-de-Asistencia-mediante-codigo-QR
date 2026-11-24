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
    <div className="space-y-6 sm:space-y-8 animate-fade-in text-slate-800">
      {/* ============================================================== */}
      {/* 1. TOP COMMAND BAR - ESTILO INSTITUCIONAL UNIVERSITARIO        */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-[#2563EB] font-bold text-[10px] uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              SISTEMA OPERATIVO
            </span>
            <span className="text-slate-400 font-mono text-[11px]">/</span>
            <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
              Control de Asistencias & Acreditación
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#142B49] tracking-tight flex items-center gap-3">
            <span>Consola de Administración Institucional</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Supervisión continua de autenticidad en tiempo real, verificación perimetral por geocerca y bitácora de asistencia académica.
          </p>
        </div>

        {/* Tactical Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSimulateSecurityBreach}
            className="h-8 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Simula un acceso anómalo con token inválido o fuera de rango"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Simular Acceso Inválido</span>
          </button>

          <button
            type="button"
            onClick={onExportFullBackup}
            className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Respaldo JSON</span>
          </button>

          <button
            type="button"
            onClick={onResetDemoData}
            className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. METRIC CARDS INSTITUCIONALES                                */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Verificados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[11px] text-[#16A34A] mb-2 font-bold">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="size-2 rounded-full bg-[#16A34A]" />
              VERIFICADOS
            </span>
            <span className="text-slate-400 text-[10px] uppercase">PRESENCIA</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#142B49] font-mono tracking-tight">
                {totalVerified}
              </div>
              <p className="text-xs text-slate-500 mt-1">Presencia confirmada</p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#16A34A] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#16A34A] font-bold text-[10px]">
              ↑ 99.8% EFECTIVIDAD
            </span>
          </div>
        </div>

        {/* Metric 2: Denegados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[11px] text-[#DC2626] mb-2 font-bold">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="size-2 rounded-full bg-[#DC2626]" />
              DENEGADOS
            </span>
            <span className="text-slate-400 text-[10px] uppercase">SEGURIDAD</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#142B49] font-mono tracking-tight">
                {totalDenials}
              </div>
              <p className="text-xs text-slate-500 mt-1">Tokens o geocerca inválidos</p>
            </div>
            <div className="size-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#DC2626] shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded bg-rose-50 text-[#DC2626] font-bold text-[10px]">
              0 SUPLANTACIONES
            </span>
          </div>
        </div>

        {/* Metric 3: Tardanzas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[11px] text-[#D97706] mb-2 font-bold">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="size-2 rounded-full bg-[#D97706]" />
              TARDANZAS
            </span>
            <span className="text-slate-400 text-[10px] uppercase">PUNTUALIDAD</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#142B49] font-mono tracking-tight">
                {totalLate}
              </div>
              <p className="text-xs text-slate-500 mt-1">Margen de 10 min superado</p>
            </div>
            <div className="size-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D97706] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-[#D97706] font-bold text-[10px]">
              TOLERANCIA ACTIVA
            </span>
          </div>
        </div>

        {/* Metric 4: Cohortes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-[11px] text-[#2563EB] mb-2 font-bold">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="size-2 rounded-full bg-[#2563EB] animate-pulse" />
              SESIONES
            </span>
            <span className="text-slate-400 text-[10px] uppercase">EN CURSO</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#142B49] font-mono tracking-tight">
                {sessions.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Aulas y talleres vinculados</p>
            </div>
            <div className="size-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] font-bold text-[10px]">
              BASE INSTITUCIONAL
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SUB-NAV TABS                                                */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
        {[
          { key: 'AUDIT', label: 'Bitácora de Asistencias', icon: ShieldCheck },
          { key: 'SECURITY', label: 'Seguridad & Cripto', icon: Key },
          { key: 'STAFF', label: 'Docentes & Permisos', icon: Users },
          { key: 'VENUES', label: 'Sedes & Geocercas', icon: Building2 },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                active
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#142B49] hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por estudiante, cédula, sesión o token..."
                className="w-full h-8 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
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
                  className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer border ${
                    logFilter === f.key
                      ? 'bg-blue-50 border-blue-300 text-[#2563EB]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label} <span className="opacity-70 font-normal">[{f.count}]</span>
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={onClearLogs}
                className="h-7 px-2 text-[11px] text-slate-500 hover:text-rose-600 transition-colors cursor-pointer font-medium"
              >
                Limpiar Bitácora
              </button>
            </div>
          </div>

          {/* Table / Grid */}
          {filteredLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500 space-y-2 shadow-sm">
              <Terminal className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-bold text-slate-700">NO SE ENCONTRARON REGISTROS QUE COINCIDAN CON LOS CRITERIOS.</p>
              <p className="text-slate-500">Prueba ajustando el filtro o el término de búsqueda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              {/* Desktop Table Header */}
              <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div className="col-span-1">Estado</div>
                <div className="col-span-3">Aprendiz / Documento</div>
                <div className="col-span-2">Sesión & Sede</div>
                <div className="col-span-2">Geocerca GPS</div>
                <div className="col-span-2">Token QR</div>
                <div className="col-span-2 text-right">Timestamp</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isVerified = log.outcome === 'VERIFIED';
                  const isLate = log.outcome === 'LATE';

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 lg:px-4 lg:py-3 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 items-center hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Estado */}
                      <div className="col-span-1 flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full shrink-0 ${
                            isVerified
                              ? 'bg-[#16A34A]'
                              : isLate
                              ? 'bg-[#D97706]'
                              : 'bg-[#DC2626]'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            isVerified
                              ? 'bg-emerald-50 border-emerald-200 text-[#16A34A]'
                              : isLate
                              ? 'bg-amber-50 border-amber-200 text-[#D97706]'
                              : 'bg-rose-50 border-rose-200 text-[#DC2626]'
                          }`}
                        >
                          {log.outcome}
                        </span>
                      </div>

                      {/* Aprendiz & Documento */}
                      <div className="col-span-3 min-w-0">
                        <div className="text-xs font-bold text-[#142B49] truncate">{log.learnerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{log.nationalId}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500 truncate">{log.reason}</span>
                        </div>
                      </div>

                      {/* Sesión & Sede */}
                      <div className="col-span-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] text-[11px] border border-blue-200 font-bold font-mono">
                          {log.sessionId}
                        </span>
                      </div>

                      {/* GPS Distance */}
                      <div className="col-span-2 flex items-center gap-2 text-xs font-mono">
                        <MapPin
                          className={`w-3.5 h-3.5 shrink-0 ${
                            log.distanceMeters <= 50 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}
                        />
                        <span className="text-slate-700 font-semibold">{log.distanceMeters}m</span>
                        <span className="text-[10px] text-slate-400">/ 50m max</span>
                      </div>

                      {/* Token QR con botón de copia */}
                      <div className="col-span-2 flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="truncate max-w-[130px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {log.tokenUsed}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(log.tokenUsed)}
                          title="Copiar token"
                          className="size-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedToken === log.tokenUsed ? (
                            <Check className="w-3 h-3 text-[#16A34A]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Timestamp */}
                      <div className="col-span-2 text-right font-mono text-xs text-slate-500 flex items-center justify-end gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VALIDACIÓN DE GEOCERCA Y COORDENADAS                           */}
          {/* ============================================================== */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Radar circular */}
              <div className="flex items-center gap-4">
                <div className="relative size-20 sm:size-24 rounded-full border border-blue-200 bg-blue-50/50 flex items-center justify-center shrink-0">
                  <div className="absolute inset-2 rounded-full border border-blue-200/50" />
                  <div className="absolute inset-5 rounded-full border border-blue-300/50" />
                  <MapPin className="size-6 text-[#2563EB]" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold uppercase text-[#142B49] tracking-wider">
                      Control Perimetral por Geocerca
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Validación satelital sobre las sedes de formación universitaria. Radio perimetral configurado en 50 metros.
                  </p>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-[#2563EB] mt-1.5 font-semibold">
                    <span>LAT 6.2442° N</span>
                    <span className="text-slate-300">·</span>
                    <span>LONG 75.5812° W</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[#16A34A]">ACTIVO</span>
                  </div>
                </div>
              </div>

              {/* Server Engine Status Readouts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Motor Backend</div>
                  <div className="text-xs font-bold text-[#142B49] mt-0.5">FastAPI Python</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Base de Datos</div>
                  <div className="text-xs font-bold text-[#142B49] mt-0.5">MySQL XAMPP</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Cifrado Token</div>
                  <div className="text-xs font-bold text-[#142B49] mt-0.5">HMAC SHA-256</div>
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
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${inst.role === 'SUPERADMIN'
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
