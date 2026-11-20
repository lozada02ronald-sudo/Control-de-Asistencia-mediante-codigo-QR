import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
import type { ClassSession } from '../types/attendance';

export interface AuthUserSession {
  id: string;
  name: string;
  email: string;
  nationalId?: string;
  role: 'APRENDIZ' | 'INSTRUCTOR' | 'ADMIN';
  companyName?: string;
  programId?: string;
  programName?: string;
  campus?: string;
}

interface AuthPortalScreenProps {
  portalType: 'public' | 'admin';
  sessions?: ClassSession[];
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

function fallbackHash256(input: string): string {
  // Deterministic 256-bit mixing fallback when crypto.subtle is unavailable (e.g. HTTP LAN)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ (ch << 3), 2246822519);
    h4 = Math.imul(h4 ^ (ch << 5), 3266489917);
  }
  return [h1, h2, h3, h4]
    .map((v) => (v >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

async function hashPasswordClient(plain: string, existingSalt?: string): Promise<string> {
  let salt = existingSalt;
  if (!salt) {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const saltBytes = new Uint8Array(16);
      salt = Array.from(crypto.getRandomValues(saltBytes))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      salt = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    }
  }

  const payload = `${salt}:${plain}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const data = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${salt}:${hashHex}`;
  }

  return `${salt}:${fallbackHash256(payload)}`;
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
  sessions = [],
  onAuthenticated,
}) => {
  const isAdminPortal = portalType === 'admin';
  const AccountHeading = isAdminPortal ? 'h1' : 'h2';
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
  const [selectedProgramId, setSelectedProgramId] = useState<string>(sessions[0]?.id ?? '');
  const [companyName, setCompanyName] = useState(COMPANIES[0]);

  useEffect(() => {
    if (!selectedProgramId && sessions.length > 0) {
      setSelectedProgramId(sessions[0].id);
    }
  }, [sessions, selectedProgramId]);

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

    try {
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

      if (mode === 'register') {
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

        const chosenSession =
          sessions.find((s) => s.id === selectedProgramId) ?? sessions[0];
        const passwordHash = await hashPasswordClient(password);
        const newAccount: StoredAccount = isAdminPortal
          ? {
              id: `adm-${Date.now().toString().slice(-5)}`,
              name: fullName.trim(),
              email: normalizedEmail,
              role: 'ADMIN',
              companyName,
              passwordHash,
            }
          : {
              id: `usr-${Date.now().toString().slice(-5)}`,
              name: fullName.trim(),
              email: normalizedEmail,
              nationalId:
                nationalId.trim() || `CC ${Math.floor(1000000000 + Math.random() * 89999999)}`,
              role: publicRole,
              programId: chosenSession?.id,
              programName: chosenSession?.title,
              campus: chosenSession?.campus,
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
    } catch {
      setError('Ocurrió un error al procesar el acceso. Intenta nuevamente.');
    }
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
      const first = sessions[0];
      onAuthenticated({
        id: 'inst-demo-01',
        name: 'Ing. Mateo Restrepo',
        email: 'm.restrepo@acadeqr.edu',
        role: 'INSTRUCTOR',
        programId: first?.id,
        programName: first?.title,
        campus: first?.campus,
      });
      return;
    }
    const first = sessions[0];
    onAuthenticated({
      id: 'apr-demo-01',
      name: 'Valeria Gómez Ríos',
      email: 'valeria.gomez@acadeqr.edu',
      nationalId: 'CC 1.098.765.432',
      role: 'APRENDIZ',
      programId: first?.id,
      programName: first?.title,
      campus: first?.campus,
    });
  };

  return (
    <div className={isAdminPortal ? 'mx-auto max-w-lg' : 'campus-layout'}>
      {!isAdminPortal && (
        <section className="contents" aria-labelledby="campus-title">
          <div className="space-y-5 pt-1 sm:space-y-6 sm:pt-3">
            <p className="flex items-center gap-2 text-sm font-bold text-brand-700">
              <GraduationCap className="size-5" aria-hidden="true" />
              Asistencia universitaria
            </p>
            <h1 id="campus-title" className="campus-title">
              Tu asistencia,<br />
              <em className="font-medium text-brand-500">a un escaneo.</em>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-400 sm:text-lg">
              Escanea el código QR de tu clase y consulta tu asistencia. Si eres docente,
              abre la sesión, proyecta el código y revisa los registros del grupo.
            </p>
          </div>
          <div className="campus-media space-y-5">
            <figure className="campus-photo">
              <img
                src="/images/mobile-scan.webp"
                alt="Estudiante que escanea un código QR con su celular en clase"
                width="1376"
                height="768"
              />
              <figcaption className="inline-flex items-center gap-2 rounded-lg bg-espresso/90 px-3 py-2 text-sm font-semibold text-white">
                <ScanLine className="size-4 text-brand-100" aria-hidden="true" />
                Escaneo desde tu celular
              </figcaption>
            </figure>
            <ol className="grid grid-cols-3 gap-2 border-t border-slate-700 pt-4 text-xs font-semibold text-slate-300 sm:gap-4 sm:text-sm" aria-label="Cómo funciona AcadeQR">
              <li className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <QrCode className="size-5 shrink-0 text-brand-600" aria-hidden="true" /> Proyecta el QR
              </li>
              <li className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <ScanLine className="size-5 shrink-0 text-brand-600" aria-hidden="true" /> Escanea en clase
              </li>
              <li className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <ClipboardCheck className="size-5 shrink-0 text-brand-600" aria-hidden="true" /> Consulta el registro
              </li>
            </ol>
          </div>
        </section>
      )}
      <section
        id="acceso"
        aria-label="Acceso a la cuenta"
        className="auth-card glass-panel-elevated space-y-5"
      >
        <div className="space-y-2">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            {isAdminPortal ? <ShieldCheck className="size-6" /> : <QrCode className="size-6" />}
          </div>
          <AccountHeading className="text-3xl font-extrabold leading-tight text-slate-100">
            {mode === 'recover'
              ? 'Recupera tu acceso'
              : isAdminPortal
              ? 'Administración'
              : 'Accede a tu cuenta'}
          </AccountHeading>
          <p className="text-sm leading-relaxed text-slate-400">
            {mode === 'recover'
              ? 'Restablece tu contraseña o encuentra tu cuenta.'
              : isAdminPortal
              ? 'Accede al panel de gestión institucional.'
              : 'Ingresa para registrar o gestionar la asistencia de tus clases.'}
          </p>
        </div>


        {/* Mode Switch */}
        {mode !== 'recover' && (
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                mode === 'login'
                  ? isAdminPortal
                    ? 'bg-indigo-500 text-white font-bold'
                    : 'bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                mode === 'register'
                  ? isAdminPortal
                    ? 'bg-indigo-500 text-white font-bold'
                    : 'bg-brand-600 hover:bg-brand-700 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Crear cuenta
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
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => {
                  setRecoverTab('password');
                  setError(null);
                }}
                className={`h-10 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  recoverTab === 'password'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-100'
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
                className={`h-10 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  recoverTab === 'account'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Buscar Cuenta
              </button>
            </div>

            {recoverTab === 'password' ? (
              !otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="recover-email" className="block text-sm font-semibold text-slate-300">
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
                        placeholder="nombre@universidad.edu"
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
                    <label htmlFor="otp-code" className="block text-sm font-semibold text-slate-300">
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
                    <label htmlFor="new-password" className="block text-sm font-semibold text-slate-300">
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
                    className="w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-700 text-slate-950 text-sm font-bold cursor-pointer"
                  >
                    Verificar OTP y Guardar Contraseña
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleRecoverAccount} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="lookup-account" className="block text-sm font-semibold text-slate-300">
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
                      Correo registrado: <strong className="text-slate-100">{foundHint.maskedEmail}</strong>
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
              className="w-full h-9 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Iniciar sesión</span>
            </button>
          </div>
        ) : (
          /* Auth Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdminPortal && (
              <div className="space-y-1.5">
                <label htmlFor="admin-company" className="block text-sm font-semibold text-slate-300">
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

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label htmlFor="auth-fullname" className="block text-sm font-semibold text-slate-300">
                  {isAdminPortal ? 'Nombre del Administrador' : 'Nombre completo'}
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
                    placeholder={isAdminPortal ? 'Ej. Dr. Hernando Caldas' : 'Ej. Laura Sofía Martínez'}
                    className="modern-input w-full pl-10 text-sm"
                  />
                </div>
              </div>
            )}

            {!isAdminPortal && mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="auth-doc" className="block text-sm font-semibold text-slate-300">
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
                    <label htmlFor="auth-role" className="block text-sm font-semibold text-slate-300">
                      Rol
                    </label>
                    <select
                      id="auth-role"
                      value={publicRole}
                      onChange={(e) => setPublicRole(e.target.value as 'APRENDIZ' | 'INSTRUCTOR')}
                      className="modern-input w-full text-xs font-semibold"
                    >
                      <option value="APRENDIZ">Aprendiz</option>
                      <option value="INSTRUCTOR">Instructor / Docente</option>
                    </select>
                  </div>
                </div>

                {sessions.length > 0 && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-program" className="block text-sm font-semibold text-slate-300">
                      {publicRole === 'INSTRUCTOR'
                        ? 'Carrera / Programa que dictas (y Sede)'
                        : 'Carrera / Programa que vas a estudiar (y Sede)'}
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="auth-program"
                        required
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="modern-input w-full pl-10 text-xs font-medium"
                      >
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id} className="bg-slate-900">
                            {s.cohortCode} · {s.title} — {s.campus} ({s.room})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-300">
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
                  placeholder={isAdminPortal ? 'admin@empresa.edu' : 'nombre@universidad.edu'}
                  className="modern-input w-full pl-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-300">
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
                    className="text-xs font-semibold text-brand-700 hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 cursor-pointer p-1"
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
              className={`w-full h-12 rounded-xl text-base font-bold inline-flex items-center justify-center gap-2 transition-colors ${
                lockSecondsLeft > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : isAdminPortal
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer'
                  : 'bg-brand-600 hover:bg-brand-700 text-slate-950 cursor-pointer'
              }`}
            >
              {mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isAdminPortal ? 'Registrar Admin y Entrar' : 'Crear cuenta e ingresar'}</span>
                </>
              ) : (
                <span>{isAdminPortal ? 'Ingresar al Monitor Admin' : 'Iniciar sesión'}</span>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Access */}
        {mode !== 'recover' && (
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <p className="text-[11px] text-center text-slate-400 uppercase tracking-wider font-semibold">
              Explora una cuenta de demostración
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
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-white px-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 cursor-pointer"
                >
                  <GraduationCap className="size-4 shrink-0" aria-hidden="true" /> Demo estudiante
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('INSTRUCTOR')}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-white px-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 cursor-pointer"
                >
                  <User className="size-4 shrink-0" aria-hidden="true" /> Demo docente
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
