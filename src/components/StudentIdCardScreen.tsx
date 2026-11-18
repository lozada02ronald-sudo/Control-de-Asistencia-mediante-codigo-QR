import React, { useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Building2,
  CheckCircle2,
  Download,
  GraduationCap,
  IdCard,
  MapPin,
  Printer,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import type { ClassSession } from '../types/attendance';
import type { AuthUserSession } from './AuthPortalScreen';
import { getInitials } from '../data/mockInstitution';
import { QrMatrix } from './QrMatrix';

interface StudentIdCardScreenProps {
  currentUser: AuthUserSession;
  sessions: ClassSession[];
  institutionName: string;
}

export const StudentIdCardScreen: React.FC<StudentIdCardScreenProps> = ({
  currentUser,
  sessions,
  institutionName,
}) => {
  const [downloading, setDownloading] = useState(false);

  const enrolledSession = useMemo(() => {
    const userNameLower = currentUser.name.trim().toLowerCase();
    const userDocLower = (currentUser.nationalId ?? '').trim().toLowerCase();
    return (
      sessions.find((s) => s.id === currentUser.programId) ??
      sessions.find((s) =>
        s.learners.some(
          (l) =>
            l.id === currentUser.id ||
            (userDocLower && l.nationalId.trim().toLowerCase() === userDocLower) ||
            l.fullName.trim().toLowerCase() === userNameLower
        )
      ) ??
      sessions[0]
    );
  }, [sessions, currentUser]);

  const programName =
    currentUser.programName || enrolledSession?.title || 'Programa Técnico Institucional';
  const campusName = currentUser.campus || enrolledSession?.campus || 'Sede Principal';
  const cohortCode = enrolledSession?.cohortCode || 'COH-2026';
  const documentId = currentUser.nationalId || 'CC 1.000.000.000';
  const currentYear = new Date().getFullYear();

  const studentQrPayload = useMemo(() => {
    return JSON.stringify({
      type: 'ACADEQR_STUDENT_ID',
      id: currentUser.id,
      name: currentUser.name,
      document: documentId,
      cohort: cohortCode,
      program: programName,
      campus: campusName,
      year: currentYear,
    });
  }, [currentUser.id, currentUser.name, documentId, cohortCode, programName, campusName, currentYear]);

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 560;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 960, 560);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 960, 560);

      // Top emerald accent bar
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, 0, 960, 14);

      // Header text
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('CARNÉ ESTUDIANTIL DIGITAL · ACADEQR', 44, 64);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px sans-serif';
      ctx.fillText(institutionName, 44, 92);

      // Avatar circle
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(100, 188, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(getInitials(currentUser.name), 100, 200);
      ctx.textAlign = 'left';

      // Student details
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(currentUser.name, 176, 178);

      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`DOC: ${documentId}   ·   FICHA: ${cohortCode}`, 176, 214);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 20px sans-serif';
      ctx.fillText(`Programa: ${programName.slice(0, 44)}`, 44, 300);
      ctx.fillText(`Sede: ${campusName}`, 44, 338);
      ctx.fillText(`Rol: APRENDIZ ACTIVO   ·   Vigencia: ${currentYear}`, 44, 376);

      ctx.fillStyle = '#34d399';
      ctx.font = '600 16px monospace';
      ctx.fillText(`ID VERIFICADO: ${currentUser.id.toUpperCase()}`, 44, 495);

      // QR Code on right
      const qrDataUrl = await QRCode.toDataURL(studentQrPayload, {
        width: 280,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(636, 130, 280, 280);
        ctx.drawImage(qrImg, 636, 130, 280, 280);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ESCANEAR PARA VERIFICAR IDENTIDAD', 776, 440);

        const link = document.createElement('a');
        link.download = `carne-estudiantil-${currentUser.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setDownloading(false);
      };
      qrImg.src = qrDataUrl;
    } catch {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Identificación Institucional Digital
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            Carné Estudiantil con QR
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Presenta este carné digital al ingresar a la sede o laboratorio para validar tu identidad y programa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={downloading}
            className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Generando...' : 'Descargar Carné (PNG)'}</span>
          </button>
        </div>
      </div>

      {/* Digital Student ID Card */}
      <div className="max-w-3xl mx-auto">
        <div className="glass-panel-elevated rounded-3xl overflow-hidden border border-emerald-500/35 shadow-2xl">
          {/* Top Institutional Strip */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950/30 backdrop-blur flex items-center justify-center text-white">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">
                  Carné Estudiantil Oficial
                </div>
                <div className="text-sm font-extrabold text-white leading-tight">
                  {institutionName}
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/40 text-emerald-100 text-xs font-bold border border-white/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ACTIVO {currentYear}
            </span>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Student Info */}
            <div className="md:col-span-7 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 text-xl font-extrabold shadow-lg shrink-0">
                  {getInitials(currentUser.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Aprendiz Matriculado
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate">
                    {currentUser.name}
                  </h2>
                  <p className="text-xs font-mono-tabular text-cyan-300 font-semibold mt-0.5">
                    Documento: {documentId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-1">
                  <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Programa / Carrera</span>
                  </div>
                  <div className="text-white font-bold leading-snug">{programName}</div>
                  <div className="text-[11px] font-mono-tabular text-cyan-300">
                    Ficha: {cohortCode}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-1">
                  <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sede / Campus</span>
                  </div>
                  <div className="text-white font-bold leading-snug">{campusName}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{enrolledSession?.room ?? 'Aula asignada'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono-tabular text-slate-400">
                <span className="inline-flex items-center gap-1.5 text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ID: {currentUser.id.toUpperCase()}
                </span>
                <span>Correo: {currentUser.email}</span>
              </div>
            </div>

            {/* Right: QR Code */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="p-4 rounded-3xl bg-white shadow-xl">
                <QrMatrix value={studentQrPayload} size={190} />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-mono-tabular font-semibold text-slate-300">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>QR Personal · {cohortCode}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
