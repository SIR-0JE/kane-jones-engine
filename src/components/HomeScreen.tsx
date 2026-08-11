"use client";

import React from "react";
import { 
  Building2, 
  Calendar, 
  ArrowRight, 
  Plus, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle2, 
  FileSpreadsheet, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Sparkles,
  DollarSign
} from "lucide-react";
import { SnapshotSummary } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface HomeScreenProps {
  displayName: string;
  snapshots: SnapshotSummary[];
  loading: boolean;
  onSelectPeriod: (periodLabel: string) => void;
  onUploadClick: () => void;
}

export function HomeScreen({
  displayName,
  snapshots,
  loading,
  onSelectPeriod,
  onUploadClick,
}: HomeScreenProps) {
  // Aggregate stats across all loaded snapshots
  const totalAudits = snapshots.length;
  const latestSnapshot = snapshots[0];
  const totalTrackedRevenue = snapshots.reduce((acc, s) => acc + (s.total_revenue || 0), 0);
  const totalTrackedLeakage = snapshots.reduce((acc, s) => acc + (s.total_recoverable_leakage || 0), 0);
  const currency = latestSnapshot?.currency_symbol || "₦";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 md:pb-12">
      {/* 1. Hub Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Depot Sales Intelligence Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {displayName}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Historical sales audits, pricing compliance, margin intelligence & leak detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onUploadClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm shadow-slate-900/10 hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Audit</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Summary Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Total Audits Available */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Audits Recorded</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1.5">
            {totalAudits} {totalAudits === 1 ? "Month" : "Months"}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {latestSnapshot ? `Latest: ${latestSnapshot.period_label}` : "No audits yet"}
          </span>
        </div>

        {/* Total Revenue Analyzed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Tracked Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1.5 truncate">
            {formatCurrency(totalTrackedRevenue, currency)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
            Across {snapshots.reduce((acc, s) => acc + (s.total_invoices || 0), 0)} invoices
          </span>
        </div>

        {/* Total Recoverable Leakage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Detected Leakage</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-rose-700 mt-1.5 truncate">
            {formatCurrency(totalTrackedLeakage, currency)}
          </div>
          <span className="text-[10px] text-rose-600 font-semibold block mt-1">
            Recoverable revenue
          </span>
        </div>

        {/* System Health / Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Engine Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base md:text-lg font-bold text-emerald-800 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Operational
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Reconciliation 100% Active
          </span>
        </div>
      </div>

      {/* 3. Monthly Audits Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Monthly Sales Audits</h2>
            <p className="text-xs text-slate-500">Select an audited month to open its dedicated analytics workspace</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {snapshots.length} {snapshots.length === 1 ? "audit available" : "audits available"}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-56 bg-slate-100/80 rounded-2xl animate-pulse border border-slate-200/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Processed Month Cards */}
            {snapshots.map((item) => {
              const itemLeak = item.total_recoverable_leakage || 0;
              const hasLeaks = itemLeak > 0;
              const hasLossAccounts = (item.loss_making_customers_count || 0) > 0;

              return (
                <div
                  key={item.period_label}
                  onClick={() => onSelectPeriod(item.period_label)}
                  className="group bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 cursor-pointer transition-all duration-150 shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  {/* Top Bar with Period & Status */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md uppercase tracking-wider mb-1.5">
                          {item.period_label}
                        </span>
                        <h3 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-slate-800 transition-colors line-clamp-1">
                          {item.audit_title}
                        </h3>
                        {item.date_range?.start && item.date_range?.end && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {item.date_range.start} to {item.date_range.end}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-1.5 bg-slate-50 group-hover:bg-slate-900 group-hover:text-white rounded-lg text-slate-400 transition-colors shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Metric Tiles */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Gross Revenue</span>
                        <span className="text-xs md:text-sm font-extrabold text-slate-900">
                          {formatCurrency(item.total_revenue, item.currency_symbol || currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Gross Profit</span>
                        <span className={`text-xs md:text-sm font-extrabold ${item.total_gross_profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatCurrency(item.total_gross_profit, item.currency_symbol || currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Overall Margin</span>
                        <span className="text-xs font-bold text-slate-700">
                          {formatPercent(item.overall_margin_pct)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Invoices Audited</span>
                        <span className="text-xs font-bold text-slate-700">
                          {formatNumber(item.total_invoices)} invoices
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Risk Badges & CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hasLeaks && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>{formatCurrency(itemLeak, item.currency_symbol || currency)} leak</span>
                        </span>
                      )}
                      {hasLossAccounts && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                          <span>{item.loss_making_customers_count} loss accts</span>
                        </span>
                      )}
                      {!hasLeaks && !hasLossAccounts && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Clean Audit</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-bold text-slate-900 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                      <span>View</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </span>
                  </div>
                </div>
              );
            })}

            {/* "Add / Upload New Month" Action Card */}
            <div
              onClick={onUploadClick}
              className="group border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-6 cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 group-hover:scale-105 group-hover:border-slate-900 group-hover:text-slate-900 transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Upload Another Month
                </h3>
                <p className="text-xs text-slate-500 max-w-[200px] mt-1">
                  Upload raw sales register `.xlsx` to run audit and save snapshot
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload Excel File</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
