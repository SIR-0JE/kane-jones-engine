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
  RotateCcw,
  Receipt,
  ArrowLeft,
  Plus,
  Settings,
  X,
  Sparkles,
  TrendingUp,
  Award,
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
  returnsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  returnsCount = 0,
  isMobileOpen = false,
  onCloseMobile,
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
      id: "marketers" as TabType,
      label: "Marketers",
      icon: Award,
      badge: null,
      badgeColor: "",
    },
    {
      id: "returns" as TabType,
      label: "Sales Returns",
      icon: RotateCcw,
      badge: returnsCount > 0 ? returnsCount : null,
      badgeColor: "bg-[#7c6fff] text-white",
    },

    {
      id: "expenses" as TabType,
      label: "Expenses",
      icon: Receipt,
      badge: null,
      badgeColor: "",
    },
    {
      id: "quality" as TabType,
      label: "Reconciliation",
      icon: CheckCircle2,
      badge: anomalyCount > 0 ? anomalyCount : null,
      badgeColor: "bg-amber-500 text-white",
    },
    {
      id: "trends" as TabType,
      label: "Cross-Month Trends",
      icon: TrendingUp,
      badge: null,
      badgeColor: "",
    },
    {
      id: "settings" as TabType,
      label: "Settings",
      icon: Settings,
      badge: null,
      badgeColor: "",
    },
  ];


  const handleItemClick = (id: TabType) => {
    onTabChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleHomeClick = () => {
    onBackToHome();
    if (onCloseMobile) onCloseMobile();
  };

  const handleUpload = () => {
    onUploadClick();
    if (onCloseMobile) onCloseMobile();
  };

  const renderSidebarContent = (isDrawer = false) => (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={handleHomeClick}
          className="flex items-center gap-2.5 group text-left min-w-0"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#7c6fff] to-[#37e0c1] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-extrabold tracking-tight text-slate-900 font-sora block leading-none truncate">
              {displayName || "Kane-Jones Depot"}
            </span>
            <span className="text-[10px] font-bold text-[#7c6fff] tracking-wider uppercase block mt-1 font-sora">
              Distil Intelligence
            </span>
          </div>
        </button>

        {isDrawer && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Snapshots Selector & Nav Section */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Back to Audits Hub Action */}
        <button
          onClick={handleHomeClick}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 hover:text-[#7c6fff] rounded-xl text-xs font-bold transition-all shadow-2xs group font-sora"
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5 text-[#7c6fff] group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Audits Hub</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">Hub</span>
        </button>

        {/* Period Selector Dropdown */}
        {allSnapshots.length > 0 && onSelectPeriod && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sora block px-1">
              Switch Audit Month
            </label>
            <select
              value={activePeriodLabel}
              onChange={(e) => {
                onSelectPeriod(e.target.value);
                if (onCloseMobile) onCloseMobile();
              }}
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
                onClick={() => handleItemClick(item.id)}
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

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* Upload Button: Primary Accent */}
        <button
          onClick={handleUpload}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[#7c6fff] to-[#5a4dde] text-white rounded-xl text-xs font-semibold shadow-[0_4px_16px_rgba(124,111,255,0.35)] hover:translate-y-[-1px] transition-all font-sora"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Upload New Month</span>
        </button>

        <div className="text-[10px] text-slate-400 text-center font-medium">
          Distil Intelligence • v1.0.0
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanently Docked Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200/90 h-screen sticky top-0 shrink-0 select-none z-20">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-Out Side Navigation Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col transform transition-transform duration-200 ease-out">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
