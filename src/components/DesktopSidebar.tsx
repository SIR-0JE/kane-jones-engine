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
  Layers
} from "lucide-react";
import { TabType } from "@/components/Navigation";
import { SnapshotSummary } from "@/types/api";

interface DesktopSidebarProps {
  displayName: string;
  activePeriodLabel: string;
  activeAuditTitle: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onBackToHome: () => void;
  onUploadClick: () => void;
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
      label: "Daily",
      icon: CalendarDays,
      badge: null,
      badgeColor: "",
    },
    {
      id: "weekly" as TabType,
      label: "Weekly",
      icon: CalendarRange,
      badge: null,
      badgeColor: "",
    },
    {
      id: "pricing" as TabType,
      label: "Pricing Audit",
      icon: ShieldAlert,
      badge: pricingLeakCount > 0 ? pricingLeakCount : null,
      badgeColor: "bg-rose-100 text-rose-800",
    },
    {
      id: "products" as TabType,
      label: "Products",
      icon: Package,
      badge: dominantProductCount > 0 ? dominantProductCount : null,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      id: "customers" as TabType,
      label: "Customers",
      icon: Users,
      badge: lossCustomerCount > 0 ? lossCustomerCount : null,
      badgeColor: "bg-rose-100 text-rose-800",
    },
    {
      id: "quality" as TabType,
      label: "Data Quality",
      icon: CheckCircle2,
      badge: anomalyCount > 0 ? anomalyCount : null,
      badgeColor: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 bg-white border-r border-slate-200/90 h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Top Header & Context */}
      <div className="p-5 space-y-5">
        {/* Brand & Hub Link */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
              KJ
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 leading-none">
                {displayName}
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">
                Sales Intelligence Engine
              </span>
            </div>
          </div>

          {/* Back to Audits Hub button */}
          <button
            onClick={onBackToHome}
            className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold border border-slate-200/80 transition-all text-left"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>All Audits Hub</span>
          </button>
        </div>

        {/* Active Period Card */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Active Audit</span>
            <span className="px-1.5 py-0.2 bg-white text-slate-700 rounded border border-slate-200 font-bold">
              {activePeriodLabel}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-900 line-clamp-1">
            {activeAuditTitle || `${activePeriodLabel} Audit`}
          </p>

          {/* If there are multiple periods, show period switcher dropdown */}
          {allSnapshots.length > 1 && onSelectPeriod && (
            <div className="pt-1.5">
              <select
                value={activePeriodLabel}
                onChange={(e) => onSelectPeriod(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {allSnapshots.map((s) => (
                  <option key={s.period_label} value={s.period_label}>
                    {s.period_label} — {s.audit_title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <div className="space-y-1 pt-1">
          <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
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
                    ? "bg-slate-900 text-white shadow-xs"
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

      {/* Bottom Actions */}
      <div className="p-5 border-t border-slate-100 space-y-3">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 shadow-xs hover:shadow transition-all"
        >
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>Upload New Month</span>
        </button>

        <div className="text-[10px] text-slate-400 text-center font-medium">
          Kane-Jones Engine • v1.0.0
        </div>
      </div>
    </aside>
  );
}
