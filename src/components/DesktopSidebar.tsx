"use client";

import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  ShieldAlert,
  Package,
  Users,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Plus,
  FileSpreadsheet,
  Layers,
  LogOut,
  Settings,
} from "lucide-react";
import { TabType } from "@/components/Navigation";
import { SnapshotSummary } from "@/types/api";
import { UserSession, getInitials } from "@/lib/auth";

interface DesktopSidebarProps {
  displayName: string;
  activePeriodLabel: string;
  activeAuditTitle: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onBackToHome: () => void;
  onUploadClick: () => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  userSession?: UserSession | null;
  allSnapshots?: SnapshotSummary[];
  onSelectPeriod?: (period: string) => void;
  pricingLeakCount: number;
  dominantProductCount: number;
  lossCustomerCount: number;
  anomalyCount: number;
}

export function DesktopSidebar({
  displayName,
  activePeriodLabel,
  activeAuditTitle,
  activeTab,
  onTabChange,
  onBackToHome,
  onUploadClick,
  onLogout,
  onOpenSettings,
  userSession,
  allSnapshots = [],
  onSelectPeriod,
  pricingLeakCount,
  dominantProductCount,
  lossCustomerCount,
  anomalyCount,
}: DesktopSidebarProps) {
  const navItems = [
    {
      id: "overview" as TabType,
      label: "Overview",
      icon: LayoutDashboard,
      badge: null,
      badgeColor: "",
    },
    {
      id: "daily" as TabType,
      label: "Daily Audit",
      icon: CalendarDays,
      badge: null,
      badgeColor: "",
    },
    {
      id: "weekly" as TabType,
      label: "Weekly Audit",
      icon: CalendarRange,
      badge: null,
      badgeColor: "",
    },
    {
      id: "pricing" as TabType,
      label: "Pricing Leaks",
      icon: ShieldAlert,
      badge: pricingLeakCount > 0 ? pricingLeakCount : null,
      badgeColor: "bg-rose-500 text-white",
    },
    {
      id: "products" as TabType,
      label: "Products",
      icon: Package,
      badge: dominantProductCount > 0 ? dominantProductCount : null,
      badgeColor: "bg-amber-500 text-white",
    },
    {
      id: "customers" as TabType,
      label: "Customers",
      icon: Users,
      badge: lossCustomerCount > 0 ? lossCustomerCount : null,
      badgeColor: "bg-rose-500 text-white",
    },
    {
      id: "quality" as TabType,
      label: "Reconciliation",
      icon: CheckCircle2,
      badge: anomalyCount > 0 ? anomalyCount : null,
      badgeColor: "bg-amber-500 text-white",
    },
    {
      id: "settings" as TabType,
      label: "Settings",
      icon: Settings,
      badge: null,
      badgeColor: "",
    },
  ];

  const initials = getInitials(userSession?.name, userSession?.email);

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200/90 h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2.5 group text-left"
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7c6fff] to-[#37e0c1] shadow-xs group-hover:scale-105 transition-transform shrink-0" />
          <div className="min-w-0">
            <span className="text-base font-extrabold tracking-tight text-slate-900 font-sora block leading-none truncate">
              {displayName || "Kane-Jones Depot"}
            </span>
            <span className="text-[10px] font-bold text-[#7c6fff] tracking-wider uppercase block mt-0.5 font-sora">
              Distil Intelligence
            </span>
          </div>
        </button>
      </div>

      {/* Snapshots Selector & Nav Section */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Period Selector Dropdown */}
        {allSnapshots.length > 0 && onSelectPeriod && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sora block px-1">
              Select Audit Period
            </label>
            <select
              value={activePeriodLabel}
              onChange={(e) => onSelectPeriod(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#7c6fff] focus:outline-none transition-all cursor-pointer"
            >
              {allSnapshots.map((s) => (
                <option key={s.period_label} value={s.period_label}>
                  {s.audit_title || `${s.period_label} Audit`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Items */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sora block px-1 mb-2">
            Audit Workspace
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#7c6fff] text-white shadow-[0_2px_12px_rgba(124,111,255,0.35)] font-sora"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Profile Card & Actions */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* User Card */}
        <div
          onClick={onOpenSettings}
          className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 cursor-pointer transition-colors"
        >
          {userSession?.avatarUrl ? (
            <img
              src={userSession.avatarUrl}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover border border-[#7c6fff]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#7c6fff] text-white font-sora text-xs font-extrabold flex items-center justify-center border border-white/20 shadow-xs shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 font-sora truncate">
              {userSession?.name || userSession?.depotName || "Manager"}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {userSession?.email || "manager@depot.com"}
            </div>
          </div>
        </div>

        {/* Upload Button: Primary Accent */}
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[#7c6fff] to-[#5a4dde] text-white rounded-xl text-xs font-semibold shadow-[0_4px_16px_rgba(124,111,255,0.35)] hover:translate-y-[-1px] transition-all font-sora"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Upload New Month</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
