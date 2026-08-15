"use client";

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Calendar, Building2, ArrowLeft, LogOut, Settings, ChevronDown, Sparkles, Menu } from "lucide-react";
import { UserSession, getInitials } from "@/lib/auth";

interface HeaderProps {
  displayName: string;
  periodLabel?: string;
  auditTitle?: string;
  dateRange?: { start: string | null; end: string | null };
  userSession?: UserSession | null;
  isHomeHub?: boolean;
  onBackToHome?: () => void;
  onUploadClick: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onToggleMobileSidebar?: () => void;
}

export function Header({
  displayName,
  periodLabel,
  auditTitle,
  dateRange,
  userSession,
  isHomeHub = false,
  onBackToHome,
  onUploadClick,
  onOpenSettings,
  onLogout,
  onToggleMobileSidebar,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = getInitials(userSession?.name, userSession?.email);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 py-3 w-full">
      <div className="flex items-center justify-between gap-2">
        {/* Left Section: Brand / Depot Title & Navigation Context */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile Navigation Drawer Toggle */}
          {!isHomeHub && onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              aria-label="Open Navigation Menu"
              className="p-1.5 -ml-1 text-slate-700 hover:text-[#7c6fff] hover:bg-slate-100/90 rounded-xl md:hidden shrink-0 transition-colors border border-slate-200/80 shadow-2xs"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
          )}

          {onBackToHome && !isHomeHub && (
            <button
              onClick={onBackToHome}
              aria-label="Back to Audits Hub"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#7c6fff] hover:bg-slate-100/90 rounded-xl transition-all border border-slate-200/80 shrink-0 font-sora mr-1 shadow-2xs group"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#7c6fff] group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Hub</span>
            </button>
          )}

          {isHomeHub ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#7c6fff] to-[#37e0c1] flex items-center justify-center text-white shadow-xs shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7c6fff] tracking-wider uppercase font-sora truncate">
                  Distil Intelligence Hub
                </div>
                <h1 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight font-sora truncate leading-none mt-0.5">
                  {displayName || "Kane-Jones Depot"}
                </h1>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                <Building2 className="w-3.5 h-3.5 text-[#7c6fff] shrink-0" />
                <span className="truncate font-semibold text-slate-700">{displayName || "Kane-Jones Depot"}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 min-w-0">
                <h1 className="text-sm md:text-base font-bold text-slate-900 tracking-tight font-sora truncate">
                  {auditTitle || `${periodLabel} Audit`}
                </h1>
                {periodLabel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 shrink-0">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    {periodLabel}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Primary Action CTA & Persistent User Avatar Dropdown */}
        <div className="flex items-center gap-3">
          {/* Primary Action Button: Brand Purple Gradient */}
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#7c6fff] to-[#5a4dde] hover:shadow-[0_4px_16px_rgba(124,111,255,0.4)] active:scale-95 transition-all shrink-0 font-sora"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Audit</span>
          </button>

          {/* User Avatar & Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
              title="Account Menu"
            >
              {userSession?.avatarUrl ? (
                <img
                  src={userSession.avatarUrl}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border border-[#7c6fff]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#7c6fff] text-white font-sora text-xs font-extrabold flex items-center justify-center border border-white/20 shadow-xs">
                  {initials}
                </div>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu Popup */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2.5 border-b border-slate-100 space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 font-sora truncate">
                    {userSession?.name || userSession?.depotName || "Depot Manager"}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {userSession?.email || "manager@depot.com"}
                  </div>
                </div>

                <div className="py-1">
                  {onOpenSettings && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#7c6fff] flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[#7c6fff]" />
                      <span>Account Settings</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
