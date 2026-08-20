"use client";

import React, { useState, useMemo } from "react";
import {
  Target,
  Award,
  AlertOctagon,
  Search,
  X,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  FileText,
  Presentation,
  Loader2,
  CheckCircle2,
  Flame,
  Briefcase,
} from "lucide-react";
import { AnalyzeResponse, TrueCostMarketerItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

const ANALYSIS_API_URL = process.env.NEXT_PUBLIC_ANALYSIS_API_URL || "";

interface MarketersScreenProps {
  data: AnalyzeResponse;
}

export function MarketersScreen({ data }: MarketersScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const marketers: TrueCostMarketerItem[] = data.true_cost_marketers || [];
  const rawInvoiceCustomers = data.customer_margin_detail || [];

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"all" | "met_target" | "below_target" | "loss">("all");
  const [drillMarketer, setDrillMarketer] = useState<TrueCostMarketerItem | null>(null);
  const [pptxLoading, setPptxLoading] = useState<boolean>(false);

  // Key KPI calculations across all marketers
  const TARGET_PER_MARKETER = 6000;
  const totalCasesSold = marketers.reduce((acc, m) => acc + (m.total_cases_sold || 0), 0);
  const totalRevenue = marketers.reduce((acc, m) => acc + (m.total_revenue || 0), 0);
  const totalGrossProfit = marketers.reduce((acc, m) => acc + (m.total_gross_profit || 0), 0);
  const overallMargin = totalRevenue > 0 ? totalGrossProfit / totalRevenue : 0;

  const metTargetCount = marketers.filter((m) => {
    const target = m.cases_target ?? TARGET_PER_MARKETER;
    const pct = m.pct_of_target_met ?? (m.total_cases_sold / target);
    return pct >= 1.0;
  }).length;

  const lossCount = marketers.filter((m) => (m.total_gross_profit || 0) < 0).length;

  // Filtered list
  const filteredMarketers = useMemo(() => {
    return marketers.filter((item) => {
      const matchesSearch = item.customer.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const target = item.cases_target ?? TARGET_PER_MARKETER;
      const pct = item.pct_of_target_met ?? (item.total_cases_sold / target);
      const isLoss = (item.total_gross_profit || 0) < 0;

      if (filterMode === "met_target") return pct >= 1.0;
      if (filterMode === "below_target") return pct < 1.0;
      if (filterMode === "loss") return isLoss;
      return true;
    });
  }, [marketers, searchTerm, filterMode]);

  // Find invoice lines for drilled marketer
  const drillInvoices = drillMarketer
    ? rawInvoiceCustomers.filter(
        (c) => c.customer.toLowerCase() === drillMarketer.customer.toLowerCase()
      )
    : [];

  // PPT Export for Marketers module (2–3 slides per spec §14 note)
  const handleDownloadPptx = async () => {
    const periodLabel = data.meta?.period_label || "unknown";
    const clientId = data.meta?.client_id || "kane-jones";
    const apiBase = ANALYSIS_API_URL || "";
    setPptxLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/presentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          _ppt_module: "marketers",
        }),
      });
      if (!res.ok) throw new Error("PPT generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientId}_${periodLabel}_marketers.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback via Next.js proxy route
      const res = await fetch(`/api/pptx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          _ppt_module: "marketers",
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${clientId}_${periodLabel}_marketers.pptx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setPptxLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header & Slide Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 font-sora">
                Marketer Intelligence &amp; Targets
              </h1>
              <p className="text-xs text-slate-500 font-inter">
                Field marketer sales performance, monthly 6,000-case target tracking &amp; true margins (§8)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PPT Export Button */}
          <button
            onClick={handleDownloadPptx}
            disabled={pptxLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold font-sora shadow hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            {pptxLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Presentation className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Export Marketer Slides</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase font-sora block">
            Total Marketers
          </span>
          <p className="text-lg font-extrabold text-slate-900 font-sora">
            {marketers.length} Reps
          </p>
          <span className="text-[10px] text-slate-400 font-inter">Active field accounts</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase font-sora block">
            Total Cases Sold
          </span>
          <p className="text-lg font-extrabold text-slate-900 font-sora">
            {formatNumber(totalCasesSold)}
          </p>
          <span className="text-[10px] text-slate-400 font-inter">
            Target: 6,000 / rep
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase font-sora block">
            Target Attainment
          </span>
          <p className="text-lg font-extrabold text-emerald-700 font-sora">
            {metTargetCount} / {marketers.length}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold font-inter">
            {marketers.length > 0 ? ((metTargetCount / marketers.length) * 100).toFixed(0) : 0}% achieved target
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase font-sora block">
            Marketer Gross Profit
          </span>
          <p
            className={`text-lg font-extrabold font-sora ${
              totalGrossProfit < 0 ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {formatCurrency(totalGrossProfit, currency, true)}
          </p>
          <span className="text-[10px] text-slate-500 font-inter">
            Margin: {formatPercent(overallMargin)}
          </span>
        </div>
      </div>

      {/* 3. Loss-Making Marketers Banner */}
      {lossCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs font-sora">
              <AlertOctagon className="w-4 h-4 text-rose-700" />
              <span>Negative Margin Marketer Accounts</span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-200 text-rose-900 rounded font-sora">
              {lossCount} in Red
            </span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed font-inter">
            These field accounts are generating negative cumulative gross profit (effective realized prices below period inventory cost basis).
          </p>
        </div>
      )}

      {/* 4. Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search marketer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          />
        </div>

        <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
              filterMode === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
            }`}
          >
            All Marketers ({marketers.length})
          </button>
          <button
            onClick={() => setFilterMode("met_target")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
              filterMode === "met_target"
                ? "bg-emerald-700 text-white shadow-2xs"
                : "text-emerald-700 hover:text-emerald-900"
            }`}
          >
            Met Target ({metTargetCount})
          </button>
          <button
            onClick={() => setFilterMode("below_target")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
              filterMode === "below_target"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-amber-700 hover:text-amber-900"
            }`}
          >
            Below Target ({marketers.length - metTargetCount})
          </button>
          <button
            onClick={() => setFilterMode("loss")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
              filterMode === "loss"
                ? "bg-rose-700 text-white shadow-2xs"
                : "text-rose-700 hover:text-rose-900"
            }`}
          >
            In the Red ({lossCount})
          </button>
        </div>
      </div>

      {/* 5. Marketers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold font-sora">
                <th className="py-3 px-4">Marketer / Representative</th>
                <th className="py-3 px-3 text-center">Invoices</th>
                <th className="py-3 px-3 text-right">Cases Sold</th>
                <th className="py-3 px-3 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Target className="w-3 h-3 text-amber-500" />
                    Target
                  </span>
                </th>
                <th className="py-3 px-3 text-right">% Met</th>
                <th className="py-3 px-4 text-right">Revenue (excl. empties)</th>
                <th className="py-3 px-4 text-right">True Cost</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-inter">
              {filteredMarketers.length > 0 ? (
                filteredMarketers.map((item, idx) => {
                  const isLoss = (item.total_gross_profit || 0) < 0;
                  const casesTarget = item.cases_target ?? TARGET_PER_MARKETER;
                  const pctTarget = item.pct_of_target_met ?? (item.total_cases_sold / casesTarget);
                  const metTarget = pctTarget >= 1.0;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isLoss ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{item.customer}</span>
                          {metTarget && (
                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 rounded uppercase font-sora">
                              Target Met
                            </span>
                          )}
                          {isLoss && (
                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-100 text-rose-800 rounded uppercase font-sora">
                              Red
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 font-semibold">
                        {item.invoices}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-800 font-semibold">
                        {formatNumber(item.total_cases_sold)}
                      </td>
                      {/* Target */}
                      <td className="py-3 px-3 text-right text-slate-400 font-medium">
                        {formatNumber(casesTarget)}
                      </td>
                      {/* % Met */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`text-xs font-bold ${
                            metTarget ? "text-emerald-700" : "text-amber-600"
                          }`}
                        >
                          {(pctTarget * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatCurrency(item.total_revenue, currency)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 font-medium">
                        {formatCurrency(item.total_cost, currency)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          isLoss ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(item.total_gross_profit, currency)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-extrabold ${
                          isLoss ? "text-rose-700" : "text-slate-800"
                        }`}
                      >
                        {formatPercent(item.gross_profit_pct)}
                      </td>
                      {/* Drill-down */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setDrillMarketer(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 transition-colors"
                          title="View marketer drill-down"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No marketers match your selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Marketer Drill-Down Modal */}
      {drillMarketer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 font-sora">
                    {drillMarketer.customer}
                  </h2>
                  <p className="text-xs text-slate-500 font-inter">
                    Marketer Performance Profile — {data.meta?.period_label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrillMarketer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
              {[
                {
                  label: "Cases Sold",
                  value: `${formatNumber(drillMarketer.total_cases_sold)} cs`,
                },
                {
                  label: "Target Attainment",
                  value: `${((drillMarketer.pct_of_target_met ?? drillMarketer.total_cases_sold / TARGET_PER_MARKETER) * 100).toFixed(1)}%`,
                  highlight:
                    (drillMarketer.pct_of_target_met ?? drillMarketer.total_cases_sold / TARGET_PER_MARKETER) >= 1.0
                      ? "text-emerald-700"
                      : "text-amber-600",
                },
                {
                  label: "Gross Revenue",
                  value: formatCurrency(drillMarketer.total_revenue, currency, true),
                },
                {
                  label: "Gross Profit",
                  value: formatCurrency(drillMarketer.total_gross_profit, currency, true),
                  highlight: (drillMarketer.total_gross_profit || 0) < 0 ? "text-rose-700" : "text-emerald-700",
                },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] text-slate-500 font-inter">{kpi.label}</p>
                  <p className={`text-sm font-extrabold font-sora ${kpi.highlight || "text-slate-900"}`}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Badges & Tags */}
            <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
              {(drillMarketer.pct_of_target_met ?? drillMarketer.total_cases_sold / TARGET_PER_MARKETER) >= 1.0 ? (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold font-sora">
                  <CheckCircle2 className="w-3 h-3" /> Target Achieved (6,000 cases)
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold font-sora">
                  <Target className="w-3 h-3" /> Below 6,000-Case Target
                </span>
              )}

              {(drillMarketer.total_gross_profit || 0) >= 0 ? (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold font-sora">
                  <TrendingUp className="w-3 h-3" /> Profitable (Margin: {formatPercent(drillMarketer.gross_profit_pct)})
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-bold font-sora">
                  <TrendingDown className="w-3 h-3" /> Loss Account (Margin: {formatPercent(drillMarketer.gross_profit_pct)})
                </span>
              )}

              <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold font-inter">
                <FileText className="w-3 h-3" /> {drillMarketer.invoices} invoices
              </span>
            </div>

            {/* Invoice Breakdown */}
            {drillInvoices.length > 0 && (
              <div className="px-5 pb-5">
                <h3 className="text-[11px] font-bold text-slate-700 mb-2 font-sora uppercase tracking-wide">
                  Associated Invoice Accounts
                </h3>
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-bold font-sora">
                        <th className="py-2 px-3 text-left">Customer / Account</th>
                        <th className="py-2 px-3 text-right">Invoices</th>
                        <th className="py-2 px-3 text-right">Revenue</th>
                        <th className="py-2 px-3 text-right">Cost</th>
                        <th className="py-2 px-3 text-right">Gross Profit</th>
                        <th className="py-2 px-3 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-inter">
                      {drillInvoices.map((inv, i) => {
                        const loss = inv.gross_profit < 0;
                        return (
                          <tr key={i} className={loss ? "bg-rose-50/40" : ""}>
                            <td className="py-2 px-3 font-semibold text-slate-900">{inv.customer}</td>
                            <td className="py-2 px-3 text-right text-slate-500">{inv.invoices}</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(inv.revenue, currency, true)}</td>
                            <td className="py-2 px-3 text-right text-slate-500">{formatCurrency(inv.cost, currency, true)}</td>
                            <td className={`py-2 px-3 text-right font-bold ${loss ? "text-rose-700" : "text-emerald-700"}`}>
                              {formatCurrency(inv.gross_profit, currency, true)}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${loss ? "text-rose-700" : "text-slate-700"}`}>
                              {formatPercent(inv.margin_pct)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
