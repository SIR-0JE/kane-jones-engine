"use client";

import React from "react";
import { UploadCloud, Calendar, Building2, ArrowLeft, LogOut } from "lucide-react";

interface HeaderProps {
  displayName: string;
  periodLabel: string;
  auditTitle?: string;
  dateRange?: { start: string | null; end: string | null };
  onBackToHome?: () => void;
  onUploadClick: () => void;
  onLogout?: () => void;
}

export function Header({
  displayName,
  periodLabel,
  auditTitle,
  dateRange,
  onBackToHome,
  onUploadClick,
  onLogout,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 py-3 w-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              aria-label="Back to Audits Hub"
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors md:hidden shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{displayName || "Kane-Jones Depot"}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <h1 className="text-sm md:text-base font-bold text-slate-900 tracking-tight truncate">
                {auditTitle || `${periodLabel} Audit`}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 shrink-0">
                <Calendar className="w-3 h-3 text-emerald-600" />
                {periodLabel || "2026-07"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all shadow-none shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Audit</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
