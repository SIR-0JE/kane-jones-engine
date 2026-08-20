"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  CalendarRange,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Filter,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Package,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { AnalyzeResponse, SnapshotSummary } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber, fetchSnapshot } from "@/lib/api";

interface TrendScreenProps {
  data: AnalyzeResponse;
  allSnapshots?: SnapshotSummary[];
  clientId?: string;
}

type PeriodMatchingScope = "full" | "w1" | "w2" | "w3" | "w4" | "tail";

interface PeriodSnapshotData {
  period_label: string;
  audit_title: string;
  payload: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;
}

export function TrendScreen({ data, allSnapshots = [], clientId = "kane-jones" }: TrendScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";

  // Available periods from snapshots list + current data period
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    if (data.meta?.period_label) set.add(data.meta.period_label);
    allSnapshots.forEach((s) => set.add(s.period_label));
    return Array.from(set).sort().reverse();
  }, [allSnapshots, data]);

  // Selected periods for comparison (default to up to 3 most recent)
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(() => {
    if (availablePeriods.length >= 3) {
      return availablePeriods.slice(0, 3);
    }
    return availablePeriods.length > 0 ? availablePeriods : [data.meta?.period_label || "2026-07"];
  });

  // Matching scope: whole period vs specific matching week across all months
  const [matchingScope, setMatchingScope] = useState<PeriodMatchingScope>("full");

  // Loaded full snapshot data cache
  const [snapshotMap, setSnapshotMap] = useState<Record<string, PeriodSnapshotData>>(() => {
    const initial: Record<string, PeriodSnapshotData> = {};
    if (data.meta?.period_label) {
      initial[data.meta.period_label] = {
        period_label: data.meta.period_label,
        audit_title: data.meta.audit_title || `${data.meta.period_label} Audit`,
        payload: data,
        loading: false,
        error: null,
      };
    }
    return initial;
  });

  // Fetch data for any selected period not yet loaded
  useEffect(() => {
    selectedPeriods.forEach(async (period) => {
      if (snapshotMap[period]?.payload || snapshotMap[period]?.loading) return;

      setSnapshotMap((prev) => ({
        ...prev,
        [period]: {
          period_label: period,
          audit_title: `${period} Audit`,
          payload: null,
          loading: true,
          error: null,
        },
      }));

      try {
        const snap = await fetchSnapshot(clientId, period);
        setSnapshotMap((prev) => ({
          ...prev,
          [period]: {
            period_label: period,
            audit_title: snap.meta?.audit_title || snap.audit_title || `${period} Audit`,
            payload: snap,
            loading: false,
            error: null,
          },
        }));
      } catch (err: any) {
        setSnapshotMap((prev) => ({
          ...prev,
          [period]: {
            period_label: period,
            audit_title: `${period} Audit`,
            payload: null,
            loading: false,
            error: err.message || "Failed to load snapshot",
          },
        }));
      }
    });
  }, [selectedPeriods, clientId, snapshotMap]);

  const togglePeriodSelection = (period: string) => {
    setSelectedPeriods((prev) => {
      if (prev.includes(period)) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter((p) => p !== period);
      } else {
        return [...prev, period].sort().reverse();
      }
    });
  };

  // Helper to extract scoped metrics for a period (e.g. Week 1 vs Full Month)
  const getScopedMetrics = (snap: PeriodSnapshotData) => {
    const p = snap.payload;
    if (!p) {
      return {
        revenue: 0,
        grossProfit: 0,
        marginPct: 0,
        invoices: 0,
        casesSold: 0,
        returns: 0,
        netRevenue: 0,
        expenses: 0,
        netProfit: 0,
      };
    }

    if (matchingScope === "full") {
      const bridge = p.net_profit_bridge;
      const grossRev = bridge?.gross_sales_revenue ?? p.meta?.total_revenue ?? 0;
      const salesReturns = bridge?.total_sales_returns ?? p.returns_analysis?.total_returns_value ?? 0;
      const netRev = bridge?.net_sales_revenue ?? (grossRev - salesReturns);
      const gp = bridge?.gross_profit ?? bridge?.net_gross_profit_loss ?? p.meta?.total_gross_profit ?? 0;
      const opex = bridge?.total_operating_expenses ?? p.expenses_analysis?.total_expenses ?? 0;
      const np = bridge?.net_profit ?? bridge?.net_operating_profit_loss ?? (gp - opex);
      const totalCases = (p.true_cost_products || []).reduce((acc, x) => acc + (x.cases_sold || 0), 0);

      return {
        revenue: grossRev,
        grossProfit: gp,
        marginPct: grossRev > 0 ? gp / grossRev : 0,
        invoices: p.meta?.total_invoices ?? 0,
        casesSold: totalCases,
        returns: salesReturns,
        netRevenue: netRev,
        expenses: opex,
        netProfit: np,
      };
    }

    // Matching week scope (W1 = week 1, W2 = week 2, etc.)
    const weekNum = matchingScope === "w1" ? 1 : matchingScope === "w2" ? 2 : matchingScope === "w3" ? 3 : matchingScope === "w4" ? 4 : 5;
    const weekRow = (p.weekly_summary || []).find((w) => w.week === weekNum);

    const weekRev = weekRow?.revenue ?? 0;
    const weekGp = weekRow?.gross_profit ?? 0;
    const weekInvoices = weekRow?.invoices ?? 0;
    const weekMargin = weekRev > 0 ? weekGp / weekRev : 0;

    // Approximate returns and expenses for the week
    const returnsWeek = (p.returns_analysis?.weekly_trend || []).find(
      (wt) => wt.week.toUpperCase() === `W${weekNum}` || (weekNum === 5 && wt.week.toUpperCase() === "TAIL")
    );
    const returnsVal = returnsWeek?.total_val ?? 0;
    const netRev = weekRev - returnsVal;
    const estimatedWeekOpex = (p.net_profit_bridge?.total_operating_expenses ?? 0) / 4;
    const weekNp = weekGp - estimatedWeekOpex;

    return {
      revenue: weekRev,
      grossProfit: weekGp,
      marginPct: weekMargin,
      invoices: weekInvoices,
      casesSold: 0,
      returns: returnsVal,
      netRevenue: netRev,
      expenses: estimatedWeekOpex,
      netProfit: weekNp,
    };
  };

  const scopeLabels: Record<PeriodMatchingScope, { label: string; sub: string }> = {
    full: { label: "Full Month", sub: "Entire billing period" },
    w1: { label: "Week 1", sub: "Days 1–7" },
    w2: { label: "Week 2", sub: "Days 8–14" },
    w3: { label: "Week 3", sub: "Days 15–21" },
    w4: { label: "Week 4", sub: "Days 22–28" },
    tail: { label: "Month End", sub: "Days 29–31" },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#7c6fff]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 font-sora">
                Cross-Month Trend &amp; Period Matching
              </h1>
              <p className="text-xs text-slate-500 font-inter">
                Side-by-side performance across 3+ months with matching-week synchronization (§15)
              </p>
            </div>
          </div>
        </div>

        {/* Period matching scope selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 overflow-x-auto self-start sm:self-auto">
          {(["full", "w1", "w2", "w3", "w4", "tail"] as PeriodMatchingScope[]).map((sc) => {
            const active = matchingScope === sc;
            return (
              <button
                key={sc}
                onClick={() => setMatchingScope(sc)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-sora transition-all shrink-0 ${
                  active
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={scopeLabels[sc].sub}
              >
                {scopeLabels[sc].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Period Selection Chips */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 font-sora flex items-center gap-1.5">
            <CalendarRange className="w-3.5 h-3.5 text-[#7c6fff]" />
            Select Months to Compare ({selectedPeriods.length} selected):
          </span>
          <span className="text-[11px] text-slate-500 font-inter">
            Click chips to toggle months in comparison
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {availablePeriods.map((p) => {
            const isSelected = selectedPeriods.includes(p);
            const title = snapshotMap[p]?.audit_title || allSnapshots.find((s) => s.period_label === p)?.audit_title || `${p} Audit`;
            return (
              <button
                key={p}
                onClick={() => togglePeriodSelection(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-sora border transition-all ${
                  isSelected
                    ? "bg-[#7c6fff] text-white border-[#7c6fff] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{p}</span>
                <span className={`text-[10px] font-medium opacity-80`}>({title})</span>
                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Side-by-Side Comparison Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-sora flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#7c6fff]" />
            Side-by-Side Performance Matrix ({scopeLabels[matchingScope].label})
          </h2>
          <span className="text-[11px] text-slate-500 font-inter">
            {matchingScope === "full" ? "Full Month Totals" : `Synchronized: ${scopeLabels[matchingScope].sub}`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedPeriods.map((period, idx) => {
            const snap = snapshotMap[period] || {
              period_label: period,
              audit_title: `${period} Audit`,
              payload: null,
              loading: true,
              error: null,
            };

            if (snap.loading) {
              return (
                <div
                  key={period}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[300px] space-y-2 shadow-2xs"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-[#7c6fff]" />
                  <p className="text-xs text-slate-500 font-sora">Loading {period} snapshot...</p>
                </div>
              );
            }

            if (snap.error) {
              return (
                <div
                  key={period}
                  className="bg-rose-50/50 rounded-2xl border border-rose-200 p-5 space-y-2"
                >
                  <div className="flex items-center gap-2 text-rose-700 text-xs font-bold font-sora">
                    <AlertCircle className="w-4 h-4" />
                    <span>Failed to load {period}</span>
                  </div>
                  <p className="text-xs text-rose-600 font-inter">{snap.error}</p>
                </div>
              );
            }

            const metrics = getScopedMetrics(snap);
            const isLatest = idx === 0;

            return (
              <div
                key={period}
                className={`bg-white rounded-2xl border transition-all p-5 space-y-4 shadow-2xs ${
                  isLatest ? "border-[#7c6fff]/40 ring-1 ring-[#7c6fff]/20" : "border-slate-200"
                }`}
              >
                {/* Period Title */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-sora uppercase">
                      {period}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 font-sora mt-1">
                      {snap.audit_title}
                    </h3>
                  </div>
                  {isLatest && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#7c6fff]/10 text-[#7c6fff] rounded font-sora">
                      Active Period
                    </span>
                  )}
                </div>

                {/* Primary KPIs */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium font-inter">Gross Revenue</span>
                    <p className="text-sm font-extrabold text-slate-900 font-sora">
                      {formatCurrency(metrics.revenue, currency, true)}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium font-inter">Gross Profit</span>
                    <p
                      className={`text-sm font-extrabold font-sora ${
                        metrics.grossProfit < 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(metrics.grossProfit, currency, true)}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium font-inter">Gross Margin %</span>
                    <p
                      className={`text-sm font-extrabold font-sora ${
                        metrics.marginPct < 0 ? "text-rose-700" : "text-slate-800"
                      }`}
                    >
                      {formatPercent(metrics.marginPct)}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium font-inter">Invoices Logged</span>
                    <p className="text-sm font-extrabold text-slate-900 font-sora">
                      {formatNumber(metrics.invoices)}
                    </p>
                  </div>
                </div>

                {/* P&L Breakdown List */}
                <div className="space-y-1.5 pt-1 text-xs border-t border-slate-100">
                  <div className="flex items-center justify-between text-slate-600 py-1">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <RotateCcw className="w-3 h-3 text-rose-500" /> Returns Credited
                    </span>
                    <span className="font-semibold text-rose-700">
                      −{formatCurrency(metrics.returns, currency, true)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 py-1">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Receipt className="w-3 h-3 text-amber-500" /> Operating Expenses
                    </span>
                    <span className="font-semibold text-slate-800">
                      −{formatCurrency(metrics.expenses, currency, true)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-bold py-1.5 border-t border-slate-100">
                    <span className="text-slate-900 font-sora">Net Operating Profit</span>
                    <span
                      className={`font-sora ${
                        metrics.netProfit < 0 ? "text-rose-700 font-extrabold" : "text-emerald-700 font-extrabold"
                      }`}
                    >
                      {formatCurrency(metrics.netProfit, currency, true)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Comparative Top Products */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#7c6fff]" />
            <h3 className="text-xs font-bold text-slate-900 font-sora">Top Selling SKUs Comparison</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-inter">Sorted by period sales volume</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedPeriods.map((period) => {
            const snap = snapshotMap[period];
            const products = snap?.payload?.product_revenue_ranking?.slice(0, 5) || [];

            return (
              <div key={period} className="space-y-2">
                <span className="text-xs font-bold text-slate-700 font-sora block">{period} Top 5:</span>
                {products.length > 0 ? (
                  <div className="space-y-1.5">
                    {products.map((prod, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 truncate block text-[11px]">
                            {prod.product_raw}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatNumber(prod.cases_sold)} cases
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-900 text-[11px] shrink-0 font-sora">
                          {formatCurrency(prod.revenue, currency, true)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3">No product data loaded.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Comparative Marketers */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#7c6fff]" />
            <h3 className="text-xs font-bold text-slate-900 font-sora">Marketer Target Attainment Comparison</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-inter">Target: 6,000 cases / marketer (§8)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedPeriods.map((period) => {
            const snap = snapshotMap[period];
            const marketers = snap?.payload?.true_cost_marketers?.slice(0, 5) || [];

            return (
              <div key={period} className="space-y-2">
                <span className="text-xs font-bold text-slate-700 font-sora block">{period} Top Marketers:</span>
                {marketers.length > 0 ? (
                  <div className="space-y-1.5">
                    {marketers.map((m, mIdx) => {
                      const target = m.cases_target ?? 6000;
                      const pct = m.pct_of_target_met ?? (m.total_cases_sold / target);
                      return (
                        <div
                          key={mIdx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 truncate text-[11px] font-sora">
                              {m.customer}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold ${
                                pct >= 1 ? "text-emerald-700" : "text-amber-600"
                              }`}
                            >
                              {(pct * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>{formatNumber(m.total_cases_sold)} / {formatNumber(target)} cases</span>
                            <span className="font-semibold text-slate-700">
                              {formatCurrency(m.total_revenue, currency, true)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3">No marketer data loaded.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
