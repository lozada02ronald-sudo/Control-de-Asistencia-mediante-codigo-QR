import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import type { AuthUserSession } from './AuthPortalScreen';
import './campus.css';

const links = [
  ['inicio', 'Inicio'],
  ['sobre-el-sistema', 'Sobre el sistema'],
  ['como-funciona', 'Cómo funciona'],
  ['beneficios', 'Beneficios'],
  ['contacto', 'Contacto'],
];

export function CampusBrand() {
  return (
    <a href="/" className="campus-brand" aria-label="Sistema de Gestión de Asistencia, inicio">
      <span className="campus-mark" aria-hidden="true">
        <QrCode size={22} />
        <GraduationCap size={16} />
      </span>
      <span>
        Acade<span>QR</span>
      </span>
    </a>
  );
}

interface CampusHomeProps {
  currentUser?: AuthUserSession | null;
  onNavigateToDashboard?: () => void;
  onNavigateToLogin?: () => void;
  onLogout?: () => void;
}

export function CampusHome({
  currentUser,
  onNavigateToDashboard,
  onNavigateToLogin,
  onLogout,
}: CampusHomeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    role: 'Estudiante',
    message: '',
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactSubmitted(true);
  };

  return (
    <div className="campus-public" id="inicio">
      <a className="sr-only focus:not-sr-only" href="#contenido">
        Saltar al contenido
      </a>

      {/* Header Institucional */}
      <header className="campus-header">
        <div className="campus-container campus-nav">
          <CampusBrand />

          <button
            type="button"
            className="campus-menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="campus-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <nav id="campus-navigation" data-open={menuOpen} aria-label="Navegación principal">
            {links.map(([id, label]) => (
              <a key={id} href={'#' + id} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
          </nav>

          <div className="campus-nav-actions">
            {currentUser ? (
              <div className="campus-user-nav-chip">
                <span className="campus-user-avatar">
                  {((currentUser.name || 'US').trim() || 'US').slice(0, 2).toUpperCase()}
                </span>
                <span className="campus-user-info">
                  <span className="campus-user-name">
                    {(currentUser.name || 'Usuario').trim().split(' ')[0] || 'Usuario'}
                  </span>
                  <span className="campus-user-role-badge">{currentUser.role || 'APRENDIZ'}</span>
                </span>
                <button
                  type="button"
                  onClick={onNavigateToDashboard}
                  className="campus-button campus-button-primary-compact"
                  title="Ingresar a la plataforma"
                >
                  <LayoutDashboard size={15} />
                  <span>Mi Panel</span>
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="campus-button-icon"
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            ) : (
              <a
                className="campus-button campus-button-outline campus-nav-login"
                href="/acceso"
                onClick={(e) => {
                  if (onNavigateToLogin) {
                    e.preventDefault();
                    onNavigateToLogin();
                  }
                }}
              >
                <span>Iniciar sesión</span>
                <ArrowRight size={16} />
              </a>
            )}
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        {/* ============================================================== */}
        {/* 1. SECCIÓN PRINCIPAL / HERO                                     */}
        {/* ============================================================== */}
        <section className="campus-hero campus-container">
          <div className="campus-hero-copy">
            <div className="campus-kicker">
              <span className="campus-kicker-badge">
                <GraduationCap size={16} aria-hidden="true" />
                ADSO · SENA
              </span>
              <span>Sistema Universitario de Asistencia</span>
            </div>

            <h1>
              Tu asistencia, <span>a un escaneo de distancia.</span>
            </h1>

            <p className="campus-lead">
              Una plataforma diseñada para facilitar el registro de asistencia universitaria
              mediante códigos QR, optimizando el tiempo de los docentes y mejorando el control
              académico de los estudiantes.
            </p>

            <div className="campus-actions">
              {currentUser ? (
                <button
                  type="button"
                  onClick={onNavigateToDashboard}
                  className="campus-button campus-button-lg"
                >
                  <LayoutDashboard size={18} />
                  <span>Ir a mi Panel Académico</span>
                  <ArrowRight size={18} />
                </button>
              ) : (
                <a
                  className="campus-button campus-button-lg"
                  href="/acceso"
                  onClick={(e) => {
                    if (onNavigateToLogin) {
                      e.preventDefault();
                      onNavigateToLogin();
                    }
                  }}
                >
                  <span>Iniciar sesión</span>
                  <ArrowRight size={18} />
                </a>
              )}
              <a className="campus-button campus-button-outline campus-button-lg" href="#como-funciona">
                <span>Conoce cómo funciona</span>
                <ChevronDown size={18} />
              </a>
            </div>

            <div className="campus-trust-row">
              <span className="campus-trust-item">
                <Check size={16} className="campus-check-green" /> 100% Digital y sin papel
              </span>
              <span className="campus-trust-item">
                <Check size={16} className="campus-check-green" /> Geocerca de aula anti-fraude
              </span>
              <span className="campus-trust-item">
                <Check size={16} className="campus-check-green" /> Trazabilidad en tiempo real
              </span>
            </div>
          </div>

          <figure className="campus-hero-photo">
            <img
              src="/images/mobile-scan.webp"
              alt="Estudiantes universitarios en un salón de clases utilizando un dispositivo móvil para escanear un código QR de asistencia"
              fetchPriority="high"
            />
            <figcaption>
              <span className="campus-badge-icon">
                <ScanLine size={20} aria-hidden="true" />
              </span>
              <div>
                <strong>Registro de Asistencia con Código QR</strong>
                <p>Verificación inmediata en el aula de clase</p>
              </div>
            </figcaption>
          </figure>
        </section>

        {/* ============================================================== */}
        {/* 2. BARRA DE MÉTRICAS INSTITUCIONALES (VARIEDAD VISUAL)           */}
        {/* ============================================================== */}
        <section className="campus-metrics-bar">
          <div className="campus-container campus-metrics-grid">
            <div className="campus-metric-card">
              <div className="campus-metric-number">3.2 seg</div>
              <div className="campus-metric-label">Tiempo promedio de escaneo</div>
              <p className="campus-metric-desc">Agilidad total al inicio de cada sesión académica.</p>
            </div>
            <div className="campus-metric-card">
              <div className="campus-metric-number">99.8%</div>
              <div className="campus-metric-label">Precisión en el registro</div>
              <p className="campus-metric-desc">Validación con geocerca y token rotativo dinámico.</p>
            </div>
            <div className="campus-metric-card">
              <div className="campus-metric-number">-85%</div>
              <div className="campus-metric-label">Ahorro de tiempo docente</div>
              <p className="campus-metric-desc">Elimina el tradicional llamado a lista manual.</p>
            </div>
            <div className="campus-metric-card">
              <div className="campus-metric-number">100%</div>
              <div className="campus-metric-label">Trazabilidad institucional</div>
              <p className="campus-metric-desc">Historial claro para estudiantes, docentes y directivos.</p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. SOBRE EL SISTEMA                                             */}
        {/* ============================================================== */}
        <section id="sobre-el-sistema" className="campus-about">
          <div className="campus-container">
            <div className="campus-section-head">
              <span className="campus-kicker">
                <BookOpen size={18} aria-hidden="true" /> Sobre el sistema
              </span>
              <h2>La asistencia, desde el aula hasta el historial académico</h2>
              <p className="campus-section-sub">
                Este proyecto surge en el programa formativo <strong>Análisis y Desarrollo de Software (ADSO) del SENA</strong>,
                diseñado con base en las necesidades reales de instituciones universitarias para transformar el control
                de presencia en una experiencia ágil, confiable y moderna.
              </p>
            </div>

            <div className="campus-pillars-grid">
              <div className="campus-pillar-card">
                <div className="campus-pillar-icon campus-icon-blue">
                  <QrCode size={26} />
                </div>
                <h3>Códigos QR Dinámicos</h3>
                <p>
                  Cada sesión genera un código QR sincronizado con rotación criptográfica cada 20 a 30 segundos,
                  impidiendo que los estudiantes compartan capturas de pantalla fuera del salón de clases.
                </p>
              </div>

              <div className="campus-pillar-card">
                <div className="campus-pillar-icon campus-icon-green">
                  <ShieldCheck size={26} />
                </div>
                <h3>Validación por Geocerca</h3>
                <p>
                  El sistema verifica que la lectura provenga del perímetro físico del aula o campus asignado,
                  garantizando presencia real y protegiendo la autenticidad de cada registro.
                </p>
              </div>

              <div className="campus-pillar-card">
                <div className="campus-pillar-icon campus-icon-navy">
                  <UserCheck size={26} />
                </div>
                <h3>Control Integral para Roles</h3>
                <p>
                  Vistas personalizadas para estudiantes (historial y carnet digital QR), docentes (proyección de aula y
                  listas de asistencia) y coordinadores (auditoría y métricas institucionales).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. CÓMO FUNCIONA                                                */}
        {/* ============================================================== */}
        <section id="como-funciona" className="campus-container campus-workflow">
          <div className="campus-section-head">
            <span className="campus-kicker">
              <Sparkles size={18} aria-hidden="true" /> Paso a paso
            </span>
            <h2>Cómo funciona el proceso de asistencia</h2>
            <p className="campus-section-sub">
              Tres pasos sencillos para pasar de un registro manual en papel a un flujo digital automatizado.
            </p>
          </div>

          <div className="campus-workflow-steps">
            <div className="campus-step-card">
              <div className="campus-step-number">01</div>
              <div className="campus-step-icon">
                <QrCode size={28} />
              </div>
              <h3>Apertura de la Sesión</h3>
              <p>
                El docente selecciona la ficha o asignatura, activa el proyector de aula y presenta el código QR dinámico
                en la pantalla principal del salón.
              </p>
              <div className="campus-step-tag">Docente</div>
            </div>

            <div className="campus-step-card">
              <div className="campus-step-number">02</div>
              <div className="campus-step-icon">
                <ScanLine size={28} />
              </div>
              <h3>Escaneo desde el Celular</h3>
              <p>
                Cada estudiante ingresa con su correo institucional, activa la cámara de su teléfono y escanea el código
                QR mostrado en pantalla.
              </p>
              <div className="campus-step-tag">Estudiante</div>
            </div>

            <div className="campus-step-card">
              <div className="campus-step-number">03</div>
              <div className="campus-step-icon">
                <ClipboardCheck size={28} />
              </div>
              <h3>Validación y Registro Inmediato</h3>
              <p>
                El sistema valida el token de seguridad, registra la hora exacta, marca la asistencia (presente o tardanza)
                y actualiza el reporte institucional.
              </p>
              <div className="campus-step-tag">Sistema</div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 5. BENEFICIOS INSTITUCIONALES                                  */}
        {/* ============================================================== */}
        <section id="beneficios" className="campus-benefits">
          <div className="campus-container campus-pair">
            <div className="campus-benefits-visual">
              <img
                src="/images/hero-classroom.webp"
                alt="Auditorio universitario moderno con estudiantes y pantalla de proyección institucional"
                loading="lazy"
              />
              <div className="campus-benefits-floating-card">
                <span className="campus-benefits-floating-icon">
                  <Clock size={20} />
                </span>
                <div>
                  <strong>Optimización del tiempo lectivo</strong>
                  <p>Hasta 15 minutos recuperados por cada bloque de clase.</p>
                </div>
              </div>
            </div>

            <div className="campus-benefits-content">
              <span className="campus-kicker">Beneficios Clave</span>
              <h2>Más tiempo pedagógico, cero errores manuales</h2>
              <p className="campus-lead">
                Una solución integral pensada para los tres pilares de la comunidad universitaria:
              </p>

              <div className="campus-benefits-list">
                <div className="campus-benefit-item">
                  <div className="campus-benefit-bullet">
                    <Check size={18} />
                  </div>
                  <div>
                    <h4>Para los Estudiantes</h4>
                    <p>Registro transparente en 3 segundos, acceso a su carnet digital QR y consulta en tiempo real de su porcentaje de asistencia.</p>
                  </div>
                </div>

                <div className="campus-benefit-item">
                  <div className="campus-benefit-bullet">
                    <Check size={18} />
                  </div>
                  <div>
                    <h4>Para los Docentes</h4>
                    <p>Elimina las planillas impresas, automatiza el cálculo de retardos y permite exportar actas oficiales de asistencia en un solo clic.</p>
                  </div>
                </div>

                <div className="campus-benefit-item">
                  <div className="campus-benefit-bullet">
                    <Check size={18} />
                  </div>
                  <div>
                    <h4>Para la Institución y Coordinación</h4>
                    <p>Detección temprana de riesgo de deserción escolar, auditoría centralizada con roles de acceso y trazabilidad perimetral verificable.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 6. CONTACTO / SOPORTE FORMATIVO                                 */}
        {/* ============================================================== */}
        <section id="contacto" className="campus-container campus-contact-section">
          <div className="campus-contact-grid">
            <div className="campus-contact-info">
              <span className="campus-kicker">
                <Mail size={18} aria-hidden="true" /> Contacto y Soporte
              </span>
              <h2>¿Preguntas o sugerencias sobre el sistema?</h2>
              <p>
                Comunícate con la coordinación académica o el equipo de aprendices de desarrollo de software
                del SENA para solicitar demostraciones, gestionar credenciales o reportar novedades.
              </p>

              <div className="campus-contact-details">
                <div className="campus-contact-card">
                  <Building2 size={20} className="campus-contact-icon" />
                  <div>
                    <strong>Centro de Formación</strong>
                    <p>Análisis y Desarrollo de Software (ADSO) · SENA</p>
                  </div>
                </div>
                <div className="campus-contact-card">
                  <MapPin size={20} className="campus-contact-icon" />
                  <div>
                    <strong>Sede de Formación</strong>
                    <p>Sede Principal Universitaria / Campus Tecnológico</p>
                  </div>
                </div>
                <div className="campus-contact-card">
                  <Mail size={20} className="campus-contact-icon" />
                  <div>
                    <strong>Correo Institucional</strong>
                    <p>contacto.adso@politecnico.edu.co</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="campus-contact-form-wrapper">
              {contactSubmitted ? (
                <div className="campus-contact-success">
                  <span className="campus-success-icon">
                    <Check size={28} />
                  </span>
                  <h3>¡Mensaje enviado con éxito!</h3>
                  <p>
                    Gracias por comunicarte con nosotros, <strong>{contactForm.name}</strong>. Nos pondremos en
                    contacto al correo <strong>{contactForm.email}</strong> a la mayor brevedad.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setContactSubmitted(false);
                      setContactForm({ name: '', email: '', role: 'Estudiante', message: '' });
                    }}
                    className="campus-button campus-button-outline"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="campus-contact-form">
                  <h3>Envíanos un mensaje institucional</h3>
                  <div className="campus-form-group">
                    <label htmlFor="contact-name">Nombre completo</label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Ej. Juan David Restrepo"
                      className="campus-input"
                    />
                  </div>

                  <div className="campus-form-group">
                    <label htmlFor="contact-email">Correo institucional</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="ejemplo@universidad.edu.co"
                      className="campus-input"
                    />
                  </div>

                  <div className="campus-form-group">
                    <label htmlFor="contact-role">Rol en la institución</label>
                    <select
                      id="contact-role"
                      value={contactForm.role}
                      onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                      className="campus-input"
                    >
                      <option value="Estudiante">Estudiante / Aprendiz</option>
                      <option value="Docente">Docente / Instructor</option>
                      <option value="Coordinador">Coordinador Académico</option>
                      <option value="Administrativo">Personal Administrativo</option>
                    </select>
                  </div>

                  <div className="campus-form-group">
                    <label htmlFor="contact-message">Mensaje o consulta</label>
                    <textarea
                      id="contact-message"
                      rows={3}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Escribe tu consulta académica o técnica..."
                      className="campus-input campus-textarea"
                    />
                  </div>

                  <button type="submit" className="campus-button campus-button-block">
                    <Send size={16} />
                    <span>Enviar consulta</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* 7. FOOTER INSTITUCIONAL                                         */}
      {/* ============================================================== */}
      <footer className="campus-footer">
        <div className="campus-container">
          <div className="campus-footer-top">
            <div className="campus-footer-brand">
              <CampusBrand />
              <p className="campus-footer-desc">
                Sistema de Gestión de Asistencia mediante Códigos QR. Proyecto formativo desarrollado en el programa
                de <strong>Análisis y Desarrollo de Software (ADSO)</strong> del <strong>SENA</strong>.
              </p>
            </div>
            <div className="campus-footer-links">
              <div>
                <h5>Navegación</h5>
                <ul>
                  {links.map(([id, label]) => (
                    <li key={id}>
                      <a href={'#' + id}>{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>Acceso Directo</h5>
                <ul>
                  <li>
                    <a
                      href="/acceso"
                      onClick={(e) => {
                        if (onNavigateToLogin) {
                          e.preventDefault();
                          onNavigateToLogin();
                        }
                      }}
                    >
                      Portal de Acceso
                    </a>
                  </li>
                  <li>
                    <a href="/admin">Consola Administrativa</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="campus-footer-bottom">
            <p>© {new Date().getFullYear()} Sistema de Gestión de Asistencia QR · ADSO SENA. Todos los derechos reservados.</p>
            <div className="campus-footer-pills">
              <span className="campus-footer-pill">Paleta Institucional</span>
              <span className="campus-footer-pill">SENA ADSO</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
