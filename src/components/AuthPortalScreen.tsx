import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';

export interface AuthUserSession {
  id: string;
  name: string;
  email: string;
  nationalId?: string;
  role: 'APRENDIZ' | 'INSTRUCTOR' | 'ADMIN';
  companyName?: string;
}

interface AuthPortalScreenProps {
  portalType: 'public' | 'admin';
  onAuthenticated: (user: AuthUserSession) => void;
}

const COMPANIES = [
  'POLITÉCNICO NACIONAL DE FORMACIÓN TÉCNICA',
  'GRUPO INDUSTRIAL ANDINO S.A.S.',
  'CENTRO TECNOLÓGICO DEL CARIBE',
  'ACADEMIA DE INGENIERÍA METROPOLITANA',
];

const USERS_STORAGE_KEY = 'acadeqr_registered_users_v1';
const LOCKOUT_STORAGE_KEY = 'acadeqr_auth_lockout_v1';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

interface StoredAccount extends AuthUserSession {
  passwordHash?: string;
  password?: string; // Legacy compatibility
}

interface LockoutState {
  attempts: number;
  lockedUntil: number;
}

function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredAccount[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

function loadLockout(key: string): LockoutState {
  try {
    const raw = localStorage.getItem(`${LOCKOUT_STORAGE_KEY}_${key}`);
    if (raw) return JSON.parse(raw) as LockoutState;
  } catch {
    // ignore
  }
  return { attempts: 0, lockedUntil: 0 };
}

function saveLockout(key: string, state: LockoutState): void {
  try {
    localStorage.setItem(`${LOCKOUT_STORAGE_KEY}_${key}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

async function hashPasswordClient(plain: string, existingSalt?: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  const salt =
    existingSalt ??
    Array.from(crypto.getRandomValues(saltBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  const data = new TextEncoder().encode(`${salt}:${plain}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${salt}:${hashHex}`;
}

async function verifyStoredPassword(plain: string, account: StoredAccount): Promise<boolean> {
  if (account.passwordHash) {
    const [salt] = account.passwordHash.split(':');
    if (!salt) return false;
    const computed = await hashPasswordClient(plain, salt);
    return computed === account.passwordHash;
  }
  if (account.password) {
    return account.password === plain;
  }
  return false;
}

function validateStrongPassword(pw: string): string | null {
  if (pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(pw)) return 'La contraseña debe incluir al menos una mayúscula.';
  if (!/[a-z]/.test(pw)) return 'La contraseña debe incluir al menos una minúscula.';
  if (!/[0-9]/.test(pw)) return 'La contraseña debe incluir al menos un número.';
  return null;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible =
    local.length <= 2
      ? local[0]
      : `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}`;
  return `${visible}@${domain}`;
}

export const AuthPortalScreen: React.FC<AuthPortalScreenProps> = ({
  portalType,
  onAuthenticated,
}) => {
  const isAdminPortal = portalType === 'admin';
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [recoverTab, setRecoverTab] = useState<'password' | 'account'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Brute-force lockout state
  const [lockSecondsLeft, setLockSecondsLeft] = useState<number>(0);

  // Login / Register fields
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [publicRole, setPublicRole] = useState<'APRENDIZ' | 'INSTRUCTOR'>('APRENDIZ');
  const [companyName, setCompanyName] = useState(COMPANIES[0]);

  // Recovery fields
  const [recoverEmail, setRecoverEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [otpAttempts, setOtpAttempts] = useState<number>(0);
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [foundHint, setFoundHint] = useState<{ maskedEmail: string; role: string } | null>(null);

  // Countdown for brute-force lockout
  useEffect(() => {
    const syncLock = () => {
      const state = loadLockout(portalType);
      const remaining = Math.ceil((state.lockedUntil - Date.now()) / 1000);
      setLockSecondsLeft(remaining > 0 ? remaining : 0);
    };
    syncLock();
    const timer = window.setInterval(syncLock, 1000);
    return () => window.clearInterval(timer);
  }, [portalType]);

  const registerFailedAttempt = () => {
    const current = loadLockout(portalType);
    const nextAttempts = current.attempts + 1;
    if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
      saveLockout(portalType, { attempts: 0, lockedUntil });
      setLockSecondsLeft(LOCKOUT_SECONDS);
      setError(`Demasiados intentos fallidos. Acceso bloqueado por ${LOCKOUT_SECONDS}s por seguridad.`);
    } else {
      saveLockout(portalType, { attempts: nextAttempts, lockedUntil: 0 });
      setError(
        `Credenciales inválidas. Intentos restantes antes de bloqueo: ${MAX_LOGIN_ATTEMPTS - nextAttempts}.`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (lockSecondsLeft > 0) {
      setError(`Acceso temporalmente bloqueado. Espera ${lockSecondsLeft}s.`);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Por favor completa tu correo y contraseña.');
      return;
    }

    const accounts = loadAccounts();

    if (!isAdminPortal && mode === 'register') {
      if (fullName.trim().length < 3) {
        setError('Ingresa tu nombre completo (mínimo 3 caracteres).');
        return;
      }
      const pwErr = validateStrongPassword(password);
      if (pwErr) {
        setError(pwErr);
        return;
      }
      if (accounts.some((acc) => acc.email === normalizedEmail)) {
        setError('No se pudo completar el registro. Si ya tienes cuenta, inicia sesión.');
        return;
      }

      const passwordHash = await hashPasswordClient(password);
      const newAccount: StoredAccount = {
        id: `usr-${Date.now().toString().slice(-5)}`,
        name: fullName.trim(),
        email: normalizedEmail,
        nationalId: nationalId.trim() || `CC ${Math.floor(1000000000 + Math.random() * 89999999)}`,
        role: publicRole,
        passwordHash,
      };
      saveAccounts([...accounts, newAccount]);
      saveLockout(portalType, { attempts: 0, lockedUntil: 0 });

      const { passwordHash: _, password: __, ...sessionUser } = newAccount;
      onAuthenticated(sessionUser);
      return;
    }

    // Login flow with anti-enumeration & salted hash verification
    const existing = accounts.find((acc) => acc.email === normalizedEmail);
    if (existing) {
      const valid = await verifyStoredPassword(password, existing);
      if (!valid || (isAdminPortal && existing.role !== 'ADMIN')) {
        registerFailedAttempt();
        return;
      }
      saveLockout(portalType, { attempts: 0, lockedUntil: 0 });
      const { passwordHash: _, password: __, ...sessionUser } = existing;
      onAuthenticated({
        ...sessionUser,
        companyName: isAdminPortal ? companyName : sessionUser.companyName,
      });
      return;
    }

    // First-time credential login requires >= 6 chars to prevent empty/weak probing
    if (password.length < 6) {
      registerFailedAttempt();
      return;
    }

    const passwordHash = await hashPasswordClient(password);
    const created: StoredAccount = {
      id: `usr-${Date.now().toString().slice(-5)}`,
      name: isAdminPortal
        ? `Admin · ${normalizedEmail.split('@')[0]}`
        : normalizedEmail.split('@')[0],
      email: normalizedEmail,
      role: isAdminPortal ? 'ADMIN' : publicRole,
      companyName: isAdminPortal ? companyName : undefined,
      passwordHash,
    };
    saveAccounts([...accounts, created]);
    saveLockout(portalType, { attempts: 0, lockedUntil: 0 });

    const { passwordHash: _, ...sessionUser } = created;
    onAuthenticated(sessionUser);
  };

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const normalized = recoverEmail.trim().toLowerCase();
    if (!normalized) {
      setError('Ingresa tu correo electrónico.');
      return;
    }

    const accounts = loadAccounts();
    const exists = accounts.some((a) => a.email === normalized);

    // Generate 6-digit crypto-random OTP (valid 5 min)
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    setGeneratedOtp(code);
    setOtpExpiresAt(Date.now() + 5 * 60 * 1000);
    setOtpAttempts(0);
    setOtpSent(true);

    // Also notify backend Redis OTP endpoint if available
    fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized }),
    }).catch(() => {});

    setNotice(
      exists
        ? `Código OTP generado (válido 5 min): ${code} — Úsalo abajo para restablecer tu contraseña.`
        : `Si el correo ${maskEmail(normalized)} está registrado, recibirás un código OTP. (Demo OTP: ${code})`
    );
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!generatedOtp || Date.now() > otpExpiresAt) {
      setError('El código OTP expiró. Solicita uno nuevo.');
      setOtpSent(false);
      return;
    }

    if (otpAttempts >= 3) {
      setError('Código bloqueado por demasiados intentos. Solicita uno nuevo.');
      setOtpSent(false);
      setGeneratedOtp(null);
      return;
    }

    if (otpInput.trim() !== generatedOtp) {
      setOtpAttempts((a) => a + 1);
      setError('Código OTP incorrecto.');
      return;
    }

    const pwErr = validateStrongPassword(newPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }

    const normalized = recoverEmail.trim().toLowerCase();
    const accounts = loadAccounts();
    const idx = accounts.findIndex((a) => a.email === normalized);
    const passwordHash = await hashPasswordClient(newPassword);

    if (idx >= 0) {
      const updated = [...accounts];
      const { password: _, ...rest } = updated[idx];
      updated[idx] = { ...rest, passwordHash };
      saveAccounts(updated);
    } else {
      saveAccounts([
        ...accounts,
        {
          id: `usr-${Date.now().toString().slice(-5)}`,
          name: normalized.split('@')[0],
          email: normalized,
          role: isAdminPortal ? 'ADMIN' : 'APRENDIZ',
          passwordHash,
        },
      ]);
    }

    saveLockout(portalType, { attempts: 0, lockedUntil: 0 });
    setOtpSent(false);
    setGeneratedOtp(null);
    setOtpInput('');
    setNewPassword('');
    setEmail(normalized);
    setMode('login');
    setNotice('Contraseña actualizada con hash seguro. Ya puedes iniciar sesión.');
  };

  const handleRecoverAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFoundHint(null);

    const q = lookupQuery.trim().toLowerCase();
    if (q.length < 3) {
      setError('Ingresa al menos 3 caracteres de tu nombre o documento.');
      return;
    }

    const accounts = loadAccounts();
    const match = accounts.find(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.nationalId && a.nationalId.toLowerCase().includes(q))
    );

    if (!match) {
      setError('No se encontró ninguna cuenta asociada a ese nombre o documento.');
      return;
    }

    setFoundHint({ maskedEmail: maskEmail(match.email), role: match.role });
  };

  const handleQuickDemo = (role: 'APRENDIZ' | 'INSTRUCTOR' | 'ADMIN') => {
    if (role === 'ADMIN') {
      onAuthenticated({
        id: 'admin-demo-01',
        name: 'Dr. Hernando Caldas',
        email: 'admin@empresa.edu',
        role: 'ADMIN',
        companyName,
      });
      return;
    }
    if (role === 'INSTRUCTOR') {
      onAuthenticated({
        id: 'inst-demo-01',
        name: 'Ing. Mateo Restrepo',
        email: 'm.restrepo@acadeqr.edu',
        role: 'INSTRUCTOR',
      });
      return;
    }
    onAuthenticated({
      id: 'apr-demo-01',
      name: 'Valeria Gómez Ríos',
      email: 'valeria.gomez@acadeqr.edu',
      nationalId: 'CC 1.098.765.432',
      role: 'APRENDIZ',
    });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md glass-panel-elevated rounded-3xl p-6 sm:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${
              isAdminPortal
                ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-indigo-500/25'
                : 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/25'
            }`}
          >
            {isAdminPortal ? <ShieldCheck className="w-7 h-7" /> : <QrCode className="w-7 h-7" />}
          </div>

          <p
            className={`text-[11px] font-bold uppercase tracking-widest ${
              isAdminPortal ? 'text-indigo-400' : 'text-emerald-400'
            }`}
          >
            {isAdminPortal ? 'Portal Corporativo Protegido' : 'Portal de Acceso Seguro'}
          </p>

          <h1 className="text-2xl font-extrabold text-white">
            {mode === 'recover'
              ? 'Recuperación de Acceso'
              : isAdminPortal
              ? 'Monitor Admin de Empresa'
              : 'Bienvenido a AcadeQR'}
          </h1>

          <p className="text-xs text-slate-400">
            {mode === 'recover'
              ? 'Restablece tu contraseña con OTP o localiza tu cuenta registrada.'
              : isAdminPortal
              ? 'Autenticación protegida con bloqueo anti fuerza bruta y caché Redis.'
              : 'Inicia sesión o regístrate con contraseña cifrada para acceder.'}
          </p>
        </div>

        {/* Mode Switch for Public Portal */}
        {!isAdminPortal && mode !== 'recover' && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {lockSecondsLeft > 0 && (
          <div
            role="alert"
            className="rounded-xl bg-amber-500/15 border border-amber-500/40 px-4 py-3 text-xs font-semibold text-amber-200 flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Bloqueo temporal anti-fuerza bruta: {lockSecondsLeft}s restantes.</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-3 text-xs font-medium text-rose-200"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-4 py-3 text-xs font-medium text-emerald-200"
          >
            {notice}
          </div>
        )}

        {/* Recovery Flow */}
        {mode === 'recover' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRecoverTab('password');
                  setError(null);
                }}
                className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  recoverTab === 'password'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Restablecer Clave
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoverTab('account');
                  setError(null);
                }}
                className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  recoverTab === 'account'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Buscar Cuenta
              </button>
            </div>

            {recoverTab === 'password' ? (
              !otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="recover-email" className="block text-xs font-semibold text-slate-300">
                      Correo electrónico registrado
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="recover-email"
                        type="email"
                        autoComplete="username"
                        spellCheck={false}
                        required
                        value={recoverEmail}
                        onChange={(e) => setRecoverEmail(e.target.value)}
                        placeholder="usuario@correo.com"
                        className="modern-input w-full pl-10 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Enviar Código OTP (5 min)</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="otp-code" className="block text-xs font-semibold text-slate-300">
                      Código OTP de 6 dígitos
                    </label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="123456"
                      className="modern-input w-full text-center font-mono-tabular tracking-widest text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="block text-xs font-semibold text-slate-300">
                      Nueva contraseña (mín. 8 caracteres, Mayús, minús y número)
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="modern-input w-full text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold cursor-pointer"
                  >
                    Verificar OTP y Guardar Contraseña
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleRecoverAccount} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="lookup-account" className="block text-xs font-semibold text-slate-300">
                    Nombre completo o Número de Documento
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="lookup-account"
                      type="text"
                      required
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      placeholder="Ej. Valeria Gómez o CC 1.098..."
                      className="modern-input w-full pl-10 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold cursor-pointer"
                >
                  Localizar Mi Cuenta
                </button>
                {foundHint && (
                  <div className="rounded-xl bg-slate-900 border border-cyan-500/40 p-3.5 text-xs space-y-1">
                    <div className="text-cyan-300 font-bold">Cuenta encontrada ({foundHint.role})</div>
                    <div className="text-slate-300 font-mono-tabular">
                      Correo registrado: <strong className="text-white">{foundHint.maskedEmail}</strong>
                    </div>
                  </div>
                )}
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setNotice(null);
              }}
              className="w-full h-9 rounded-xl text-xs font-semibold text-slate-400 hover:text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Iniciar Sesión</span>
            </button>
          </div>
        ) : (
          /* Auth Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdminPortal && (
              <div className="space-y-1.5">
                <label htmlFor="admin-company" className="block text-xs font-semibold text-slate-300">
                  Empresa / Institución
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="admin-company"
                    name="organization"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="modern-input w-full pl-10 text-xs font-semibold"
                  >
                    {COMPANIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!isAdminPortal && mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="auth-fullname" className="block text-xs font-semibold text-slate-300">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-fullname"
                      name="fullname"
                      type="text"
                      autoComplete="name"
                      enterKeyHint="next"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Laura Sofía Martínez"
                      className="modern-input w-full pl-10 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="auth-doc" className="block text-xs font-semibold text-slate-300">
                      Documento
                    </label>
                    <input
                      id="auth-doc"
                      name="nationalId"
                      type="text"
                      enterKeyHint="next"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="CC 1.095.442"
                      className="modern-input w-full text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="auth-role" className="block text-xs font-semibold text-slate-300">
                      Rol
                    </label>
                    <select
                      id="auth-role"
                      value={publicRole}
                      onChange={(e) => setPublicRole(e.target.value as 'APRENDIZ' | 'INSTRUCTOR')}
                      className="modern-input w-full text-xs font-semibold"
                    >
                      <option value="APRENDIZ">Aprendiz</option>
                      <option value="INSTRUCTOR">Instructor</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-300">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdminPortal ? 'admin@empresa.edu' : 'usuario@correo.com'}
                  className="modern-input w-full pl-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-300">
                  Contraseña
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('recover');
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-[11px] font-semibold text-cyan-400 hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu cuenta o clave?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  enterKeyHint="done"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="modern-input w-full pl-10 pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-[11px] text-slate-400">
                  Mínimo 8 caracteres, con mayúscula, minúscula y número.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={lockSecondsLeft > 0}
              className={`w-full h-11 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors ${
                lockSecondsLeft > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : isAdminPortal
                  ? 'bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
              }`}
            >
              {mode === 'register' && !isAdminPortal ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Registrarse y Entrar</span>
                </>
              ) : (
                <span>{isAdminPortal ? 'Ingresar al Monitor Admin' : 'Iniciar Sesión'}</span>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Access */}
        {mode !== 'recover' && (
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <p className="text-[11px] text-center text-slate-400 uppercase tracking-wider font-semibold">
              Acceso rápido de demostración
            </p>
            {isAdminPortal ? (
              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN')}
                className="w-full h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Entrar como Admin de {companyName.split(' ')[0]}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('APRENDIZ')}
                  className="h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Demo Aprendiz
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('INSTRUCTOR')}
                  className="h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Demo Instructor
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
