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
  DollarSign,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { SnapshotSummary } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface HomeScreenProps {
  displayName: string;
  snapshots: SnapshotSummary[];
  loading: boolean;
  onSelectPeriod: (periodLabel: string) => void;
  onUploadClick: () => void;
  depotMissing?: boolean;
  onRecreateDepot?: (depotName: string) => Promise<void>;
  onDeletePeriod?: (periodLabel: string) => Promise<void>;
}

export function HomeScreen({
  displayName,
  snapshots,
  loading,
  onSelectPeriod,
  onUploadClick,
  depotMissing,
  onRecreateDepot,
  onDeletePeriod,
}: HomeScreenProps) {
  const [recreateName, setRecreateName] = React.useState(displayName || "My Beverage Depot");
  const [recreating, setRecreating] = React.useState(false);
  const [recreateError, setRecreateError] = React.useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<SnapshotSummary | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Aggregate stats across all loaded snapshots
  const totalAudits = snapshots.length;
  const latestSnapshot = snapshots[0];
  const totalTrackedRevenue = snapshots.reduce((acc, s) => acc + (s.total_revenue || 0), 0);
  const totalTrackedLeakage = snapshots.reduce((acc, s) => acc + (s.total_recoverable_leakage || 0), 0);
  const currency = latestSnapshot?.currency_symbol || "₦";

  const handleRecreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recreateName.trim() || !onRecreateDepot) return;
    try {
      setRecreating(true);
      setRecreateError(null);
      await onRecreateDepot(recreateName.trim());
    } catch (err: any) {
      setRecreateError(err?.message || "Failed to initialize depot workspace.");
    } finally {
      setRecreating(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6 space-y-8 pb-24 md:pb-12 max-w-7xl mx-auto">
      {/* Missing Depot Warning / Re-initialization Card */}
      {depotMissing && (
        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-300/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                  Action Required
                </span>
                <span className="text-xs text-slate-500 font-semibold">Account Active</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-sora">
                Depot Workspace Setup / Reconnection Required
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-inter max-w-3xl leading-relaxed">
                Your user session is active, but no matching depot record was found in the database (it may have been reset or removed). Enter your depot name below to initialize a fresh database record and resume uploading audits.
              </p>
            </div>
          </div>

          <form onSubmit={handleRecreateSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={recreateName}
                onChange={(e) => setRecreateName(e.target.value)}
                placeholder="e.g. Kane-Jones Depot (Ogun State)"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c6fff] shadow-xs"
                disabled={recreating}
                required
              />
            </div>
            <button
              type="submit"
              disabled={recreating || !recreateName.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 shrink-0 font-sora cursor-pointer"
            >
              {recreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Initialize Depot Workspace</span>
                </>
              )}
            </button>
          </form>
          {recreateError && (
            <p className="text-xs font-semibold text-rose-600">{recreateError}</p>
          )}
        </div>
      )}

      {/* 1. Hub Sub-Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 bg-[#7c6fff]/10 rounded-md text-[#7c6fff]">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sora">
              Depot Sales Intelligence Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sora">
            {displayName} — Monthly Audits
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-inter">
            Historical sales audits, pricing compliance, margin intelligence & leak detection.
          </p>
        </div>

        <button
          onClick={onUploadClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#7c6fff] to-[#5a4dde] hover:shadow-[0_4px_16px_rgba(124,111,255,0.35)] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs shrink-0 font-sora"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Audit</span>
        </button>
      </div>

      {/* 2. Top-Level Summary Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {/* Total Audits Available */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Audits Recorded</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl xl:text-3xl font-extrabold text-slate-900 mt-2">
            {totalAudits} {totalAudits === 1 ? "Month" : "Months"}
          </div>
          <span className="text-xs text-slate-400 block mt-1">
            {latestSnapshot ? `Latest: ${latestSnapshot.period_label}` : "No audits yet"}
          </span>
        </div>

        {/* Total Revenue Analyzed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tracked Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl xl:text-3xl font-extrabold text-slate-900 mt-2 truncate">
            {formatCurrency(totalTrackedRevenue, currency, true)}
          </div>
          <span className="text-xs text-emerald-700 font-semibold block mt-1">
            Across {snapshots.reduce((acc, s) => acc + (s.total_invoices || 0), 0)} invoices
          </span>
        </div>

        {/* Total Recoverable Leakage */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold">
            <span>Detected Leakage</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl xl:text-3xl font-extrabold text-rose-700 mt-2 truncate">
            {formatCurrency(totalTrackedLeakage, currency, true)}
          </div>
          <span className="text-xs text-rose-600 font-semibold block mt-1">
            Recoverable revenue
          </span>
        </div>

        {/* System Health / Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Ingestion Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl xl:text-3xl font-extrabold text-slate-900 mt-2">
            100%
          </div>
          <span className="text-xs text-slate-400 block mt-1">
            Supabase DB & Storage Connected
          </span>
        </div>
      </div>

      {/* 3. Month Slots Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Monthly Sales Audits</h2>
            <p className="text-xs text-slate-500">Select an audited month to open its dedicated analytics workspace</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {snapshots.length} {snapshots.length === 1 ? "audit available" : "audits available"}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2].map((n) => (
              <div key={n} className="h-64 bg-slate-100/80 rounded-2xl animate-pulse border border-slate-200/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                      <div className="flex items-center gap-1">
                        {onDeletePeriod && (
                          <button
                            type="button"
                            title={`Delete ${item.period_label} audit`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(item);
                            }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="p-1.5 bg-slate-50 group-hover:bg-slate-900 group-hover:text-white rounded-lg text-slate-400 transition-colors shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Metric Tiles */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Gross Revenue</span>
                        <span className="text-xs md:text-sm font-extrabold text-slate-900">
                          {formatCurrency(item.total_revenue, item.currency_symbol || currency, true)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Gross Profit</span>
                        <span className={`text-xs md:text-sm font-extrabold ${item.total_gross_profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatCurrency(item.total_gross_profit, item.currency_symbol || currency, true)}
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
                          <span>{formatCurrency(itemLeak, item.currency_symbol || currency, true)} leak</span>
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

      {/* Delete Audit Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sora">Delete Monthly Audit?</h3>
                <p className="text-xs text-slate-500 font-inter">{deleteTarget.audit_title || deleteTarget.period_label}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-inter">
              Are you sure you want to delete the <span className="font-bold text-slate-900">{deleteTarget.period_label}</span> audit? This will permanently remove its recorded analysis data, reports, and leak diagnostics from your depot history.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold font-sora transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!onDeletePeriod || !deleteTarget) return;
                  try {
                    setDeleting(true);
                    setDeleteError(null);
                    await onDeletePeriod(deleteTarget.period_label);
                    setDeleteTarget(null);
                  } catch (err: any) {
                    setDeleteError(err?.message || "Failed to delete audit.");
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold font-sora transition-all shadow-xs disabled:opacity-60 flex items-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleting ? "Deleting…" : "Delete Audit"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
