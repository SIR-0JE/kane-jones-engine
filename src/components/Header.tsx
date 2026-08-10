"use client";

import React from "react";
import { UploadCloud, Calendar, Building2 } from "lucide-react";

interface HeaderProps {
  displayName: string;
  periodLabel: string;
  dateRange?: { start: string | null; end: string | null };
  onUploadClick: () => void;
}

export function Header({
  displayName,
  periodLabel,
  dateRange,
  onUploadClick,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[200px] sm:max-w-none">{displayName || "Kane-Jones Depot"}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Sales Intelligence</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              <Calendar className="w-3 h-3" />
              {periodLabel || "July 2026"}
            </span>
          </div>
        </div>

        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all shadow-none"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>
    </header>
  );
}
