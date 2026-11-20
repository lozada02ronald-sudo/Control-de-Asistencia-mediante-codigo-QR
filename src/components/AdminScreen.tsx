import React, { useEffect, useState } from 'react';
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

  const filteredLogs = scanLogs.filter((log) => {
    if (logFilter === 'ALL') return true;
    return log.outcome === logFilter;
  });

  const totalDenials = scanLogs.filter((l) => l.outcome === 'DENIED').length;
  const totalVerified = scanLogs.filter((l) => l.outcome === 'VERIFIED').length;
  const totalLate = scanLogs.filter((l) => l.outcome === 'LATE').length;

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
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            Consola de Auditoría y Control RBAC
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100">
            Administración Institucional
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onSimulateSecurityBreach}
            className="h-10 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-300 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Simular Suplantación</span>
          </button>

          <button
            type="button"
            onClick={onExportFullBackup}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Backup JSON</span>
          </button>

          <button
            type="button"
            onClick={onResetDemoData}
            className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Restablecer BD</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verificaciones Válidas</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono-tabular">{totalVerified}</div>
          <p className="text-xs text-slate-400">Presencia confirmada</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Intentos Denegados</span>
          </div>
          <div className="text-3xl font-extrabold text-rose-400 font-mono-tabular">{totalDenials}</div>
          <p className="text-xs text-slate-400">Tokens o geocerca inválidos</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Tardanzas</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-300 font-mono-tabular">{totalLate}</div>
          <p className="text-xs text-slate-400">Tras límite de gracia</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Sesiones Activas</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono-tabular">{sessions.length}</div>
          <p className="text-xs text-slate-400">Cohortes registradas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 overflow-x-auto">
        {[
          { key: 'AUDIT', label: 'Auditoría de Registros', icon: ShieldCheck },
          { key: 'SECURITY', label: 'Seguridad y Cripto', icon: Key },
          { key: 'STAFF', label: 'Docentes y RBAC', icon: Users },
          { key: 'VENUES', label: 'Sedes y Aulas', icon: Building2 },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                active
                  ? 'bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 01: Audit Log */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Registro Forense de Escaneos</h2>
              <p className="text-xs text-slate-400">Trazabilidad de lecturas QR y alertas de ubicación</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {(['ALL', 'DENIED', 'LATE', 'VERIFIED'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setLogFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer ${
                    logFilter === filter
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {filter === 'ALL' ? 'Todos' : filter === 'DENIED' ? 'Denegados' : filter === 'LATE' ? 'Tardanzas' : 'Válidos'}
                </button>
              ))}

              <button
                type="button"
                onClick={onClearLogs}
                className="ml-2 text-slate-400 hover:text-rose-400 underline cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-sm text-slate-400">
              No hay incidentes en la categoría seleccionada.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        log.outcome === 'VERIFIED'
                          ? 'bg-emerald-400'
                          : log.outcome === 'LATE'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-slate-100 truncate">
                          {log.learnerName}
                        </span>
                        <span className="font-mono-tabular text-xs text-slate-400">
                          {log.nationalId}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">{log.reason}</div>
                      <div className="font-mono-tabular text-[11px] text-slate-500 mt-1">
                        Sesión: {log.sessionId} · Token: {log.tokenUsed} · GPS: {log.distanceMeters}m
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center font-mono-tabular text-xs">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                        log.outcome === 'VERIFIED'
                          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                          : log.outcome === 'LATE'
                          ? 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                          : 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                      }`}
                    >
                      {log.outcome}
                    </span>
                    <span className="text-slate-400">{log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 02: Security */}
      {activeTab === 'SECURITY' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">Motor de Firma Criptográfica</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generación y validación de tokens rotativos dinámicos.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Algoritmo
                </label>
                <input
                  type="text"
                  disabled
                  value={config.cryptoAlgorithm}
                  className="modern-input w-full text-xs font-mono-tabular opacity-75 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Llave Secreta HMAC
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled
                    value={config.hmacSecretKeyMasked}
                    className="modern-input flex-1 text-xs font-mono-tabular opacity-85 cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={handleRotateSecretKey}
                    className="h-11 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Rotar Clave
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    TTL de Rotación
                  </label>
                  <select
                    value={config.defaultTtlSeconds}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, defaultTtlSeconds: Number(e.target.value) }))
                    }
                    className="modern-input w-full text-xs font-mono-tabular"
                  >
                    <option value={15} className="bg-slate-900">15 segundos</option>
                    <option value={20} className="bg-slate-900">20 segundos</option>
                    <option value={30} className="bg-slate-900">30 segundos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Geocerca Máxima
                  </label>
                  <select
                    value={config.maxGeofenceMeters}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, maxGeofenceMeters: Number(e.target.value) }))
                    }
                    className="modern-input w-full text-xs font-mono-tabular"
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

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">Directivas de Integridad</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Políticas de acceso institucional y control anti-fraude.
              </p>
            </div>

            <label className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.strictGeofenceEnforced}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, strictGeofenceEnforced: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-emerald-500 mt-0.5"
              />
              <div>
                <div className="text-sm font-bold text-slate-100">Modo Estricto de Geocerca GPS</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bloquea registros fuera del radio autorizado del aula.
                </p>
              </div>
            </label>

            <label className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.allowManualOverride}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, allowManualOverride: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-emerald-500 mt-0.5"
              />
              <div>
                <div className="text-sm font-bold text-slate-100">Anulación Manual por Instructor</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permite marcar asistencia con verificación física en aula.
                </p>
              </div>
            </label>

            <label className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.tamperProtectionActive}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, tamperProtectionActive: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-emerald-500 mt-0.5"
              />
              <div>
                <div className="text-sm font-bold text-slate-100">Protección Anti-Captura</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Invalida tokens compartidos fuera del aula tras expirar su TTL.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Tab 03: Staff */}
      {activeTab === 'STAFF' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Plantel de Instructores y Roles</h2>
              <p className="text-xs text-slate-400">Credenciales y permisos RBAC</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddStaffOpen(true)}
              className="h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Docente</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {instructors.map((inst) => (
              <div
                key={inst.id}
                className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                    {inst.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-100 truncate">{inst.name}</div>
                    <div className="text-xs font-mono-tabular text-slate-400 truncate">
                      {inst.email} · {inst.department}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center text-xs">
                  <span
                    className={`rounded-full px-3 py-1 font-semibold border ${
                      inst.role === 'SUPERADMIN'
                        ? 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                        : inst.role === 'COORDINADOR'
                        ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {inst.role}
                  </span>
                  <span className="font-mono-tabular text-emerald-400">{inst.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 04: Venues */}
      {activeTab === 'VENUES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {venues.map((venue) => (
            <article key={venue.id} className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-cyan-400">{venue.campus}</div>
                  <h3 className="text-lg font-bold text-slate-100 mt-0.5">{venue.name}</h3>
                </div>
                <span className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-mono-tabular text-slate-100">
                  {venue.roomCode}
                </span>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs font-mono-tabular text-slate-400">
                <span>Geocerca: {venue.geofenceRadius}m</span>
                <span>Cohortes activas: {venue.activeCohorts}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/50 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-panel-elevated rounded-3xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">
              Acreditar Nuevo Docente
            </h2>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Ej. Ing. Laura Gómez Vallejo"
                  className="modern-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Correo Institucional
                </label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="l.gomez@politecnico.edu"
                  className="modern-input w-full text-sm font-mono-tabular"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Departamento
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffDept}
                    onChange={(e) => setNewStaffDept(e.target.value)}
                    className="modern-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Rol RBAC
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as 'INSTRUCTOR' | 'COORDINADOR')}
                    className="modern-input w-full text-sm"
                  >
                    <option value="INSTRUCTOR" className="bg-slate-900">Instructor</option>
                    <option value="COORDINADOR" className="bg-slate-900">Coordinador</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold text-sm cursor-pointer"
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
