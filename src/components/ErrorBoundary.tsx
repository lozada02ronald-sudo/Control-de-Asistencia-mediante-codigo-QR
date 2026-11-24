import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AcadeQR ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('acadeqr_public_auth_v1');
      localStorage.removeItem('acadeqr_admin_auth_v1');
      localStorage.removeItem('acadeqr_public_auth');
      localStorage.removeItem('acadeqr_admin_auth');
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#F4F6F9',
          color: '#142B49',
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '36px',
            boxShadow: '0 10px 25px -5px rgba(20, 43, 73, 0.08), 0 8px 10px -6px rgba(20, 43, 73, 0.04)',
            border: '1px solid #E2E8F0',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              border: '1px solid #FEE2E2'
            }}>
              <AlertTriangle size={28} />
            </div>

            <span style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#2563EB',
              backgroundColor: '#EFF6FF',
              padding: '4px 10px',
              borderRadius: '999px',
              marginBottom: '12px'
            }}>
              Sistema de Asistencia Universitario · AcadeQR
            </span>

            <h1 style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#142B49',
              margin: '0 0 10px 0',
              lineHeight: 1.3
            }}>
              Se detectó una discrepancia en la sesión
            </h1>

            <p style={{
              fontSize: '14px',
              color: '#64748B',
              lineHeight: 1.55,
              margin: '0 0 24px 0'
            }}>
              La plataforma encontró datos previos en caché que requieren restablecerse para cargar la interfaz universitaria correctamente.
            </p>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px 22px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Home size={16} />
                <span>Restablecer y volver al inicio</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#F8FAFC',
                  color: '#142B49',
                  border: '1px solid #CBD5E1',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
                <span>Recargar página</span>
              </button>
            </div>

            {this.state.error && (
              <details style={{
                textAlign: 'left',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#475569',
                marginTop: '16px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#64748B' }}>
                  Detalles técnicos del error
                </summary>
                <pre style={{
                  marginTop: '10px',
                  padding: '8px',
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  fontSize: '11px',
                  fontFamily: 'Consolas, monospace'
                }}>
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
