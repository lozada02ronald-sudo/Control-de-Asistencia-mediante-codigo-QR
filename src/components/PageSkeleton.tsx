import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando interfaz...">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-3 w-44 rounded-full bg-slate-800" />
          <div className="h-9 w-72 rounded-xl bg-slate-800/90" />
        </div>
        <div className="h-11 w-40 rounded-xl bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-3">
            <div className="h-3 w-28 rounded-full bg-slate-800" />
            <div className="h-10 w-24 rounded-lg bg-slate-800/80" />
            <div className="h-3 w-36 rounded-full bg-slate-800/60" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-2xl bg-slate-900/70 border border-slate-800" />
        <div className="h-72 rounded-2xl bg-slate-900/70 border border-slate-800" />
      </div>
    </div>
  );
};
