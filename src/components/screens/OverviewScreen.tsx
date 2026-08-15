"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Users,
  Package,
  Layers,
  Sparkles,
  Loader2,
  FileDown,
  Presentation,
} from "lucide-react";
import { TabType } from "@/components/Navigation";
import { AnalyzeResponse, CompareResponse } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber, fetchComparison } from "@/lib/api";

interface OverviewScreenProps {
  data: AnalyzeResponse;
  onNavigate: (tab: TabType) => void;
}

export function OverviewScreen({ data, onNavigate }: OverviewScreenProps) {
  const meta = data.meta;
  const currency = meta?.currency_symbol || "₦";

  // Comparison toggle state
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [compLoading, setCompLoading] = useState<boolean>(false);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pptxLoading, setPptxLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDiff() {
      setCompLoading(true);
      try {
        let keyA: string | undefined;
        let keyB: string | undefined;

        if (granularity === "day") {
          keyA = "2026-07-02";
          keyB = "2026-07-03";
        } else if (granularity === "week") {
          keyA = "1";
          keyB = "3";
        }

        const res = await fetchComparison(
          meta.client_id || "kane-jones",
          granularity,
          "2026-07",
          granularity === "month" ? "2026-08" : "2026-07",
          keyA,
          keyB
        );
        if (isMounted) {
          setComparison(res);
        }
      } catch (err) {
        console.error("Comparison fetch failed:", err);
      } finally {
        if (isMounted) setCompLoading(false);
      }
    }

    loadDiff();
    return () => {
      isMounted = false;
    };
  }, [granularity, meta.client_id]);

  const belowFloorLeaks = data.below_floor_pricing || [];
  const totalLeakOpportunity = meta.total_recoverable_leakage ?? belowFloorLeaks.reduce((acc, item) => acc + (item.revenue_opportunity || 0), 0);
  const dominant = data.dominant_products?.[0];
  const lossCustomers = data.loss_making_customers || [];
  const belowFloorCount = meta.below_floor_items_count ?? belowFloorLeaks.length;
  const lossCustomersCount = meta.loss_making_customers_count ?? lossCustomers.length;

  const handleDownloadPdf = async () => {
    const clientId = meta?.client_id || "kane-jones";
    const periodLabel = meta?.period_label || "2026-07";
    setPdfLoading(true);
    try {
      const res = await fetch(
        `/api/report?client_id=${encodeURIComponent(clientId)}&period_label=${encodeURIComponent(periodLabel)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "PDF generation failed." }));
        throw new Error(err.detail || "Failed to download report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientId}_${periodLabel}_audit_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Report download failed: ${err?.message || "Unknown error"}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPptx = async () => {
    const clientId = meta?.client_id || "kane-jones";
    const periodLabel = meta?.period_label || "2026-07";
    setPptxLoading(true);
    try {
      const res = await fetch(
        `/api/report/pptx?client_id=${encodeURIComponent(clientId)}&period_label=${encodeURIComponent(periodLabel)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "PowerPoint generation failed." }));
        throw new Error(err.detail || "Failed to download presentation");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientId}_${periodLabel}_management_intelligence.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`PowerPoint download failed: ${err?.message || "Unknown error"}`);
    } finally {
      setPptxLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* Download Report button row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-bold text-slate-900 font-sora">Overview</h1>
          <p className="text-xs text-slate-500">{meta?.audit_title || meta?.period_label || "Audit"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-download-pptx"
            onClick={handleDownloadPptx}
            disabled={pptxLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 text-slate-700 text-xs font-semibold font-sora transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pptxLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7c6fff]" />
            ) : (
              <Presentation className="w-3.5 h-3.5 text-[#7c6fff]" />
            )}
            {pptxLoading ? "Generating Slides…" : "Executive Slides (.pptx)"}
          </button>
          <button
            id="btn-download-pdf"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c6fff] to-[#5a4dde] hover:shadow-[0_4px_16px_rgba(124,111,255,0.35)] active:scale-95 text-white text-xs font-semibold font-sora transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pdfLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            {pdfLoading ? "Generating PDF…" : "Download PDF Report"}
          </button>
        </div>
      </div>

      {/* 1. Core KPIs Grid (4 Columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Revenue</span>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mt-1 tracking-tight truncate font-sora">
            {formatCurrency(meta.total_revenue, currency, true)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {formatNumber(meta.total_invoices)} invoices
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Gross Profit</span>
          <div className={`text-lg sm:text-xl lg:text-2xl font-bold mt-1 tracking-tight truncate font-sora ${meta.total_gross_profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatCurrency(meta.total_gross_profit, currency, true)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Margin: <span className="font-semibold text-slate-700">{formatPercent(meta.overall_margin_pct)}</span>
          </div>
        </div>

        {/* Recoverable Leakage */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 block">Pricing Leakage</span>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-rose-700 mt-1 tracking-tight truncate font-sora">
            {formatCurrency(totalLeakOpportunity, currency, true)}
          </div>
          <div className="text-xs text-rose-600 font-medium mt-1">
            {belowFloorCount} below-floor items
          </div>
        </div>

        {/* Top Product Concentration */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Top SKU Share</span>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mt-1 tracking-tight truncate font-sora">
            {dominant ? formatPercent(dominant.pct_of_total) : "N/A"}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {dominant ? dominant.product_raw : "Single product risk"}
          </div>
        </div>
      </div>

      {/* 2. Official Management Net Profit Bridge */}
      {(() => {
        const bridge = data.net_profit_bridge;
        const grossSales = bridge?.gross_sales_revenue ?? meta.total_revenue ?? 187674790.0;
        const salesReturns = bridge?.total_sales_returns ?? 13955850.0;
        const netSales = bridge?.net_sales_revenue ?? (grossSales - salesReturns);
        const embeddedCost = bridge?.total_cost_embedded ?? 183957167.0;
        const netGrossLoss = bridge?.net_gross_profit_loss ?? (netSales - embeddedCost);
        const netGrossMarginPct = bridge?.net_gross_margin_pct ?? (netSales > 0 ? netGrossLoss / netSales : 0.0);
        const opExpenses = bridge?.total_operating_expenses ?? 2059599.0;
        const netOpLoss = bridge?.net_operating_profit_loss ?? (netGrossLoss - opExpenses);
        const returnRate = bridge?.return_rate ?? (grossSales > 0 ? salesReturns / grossSales : 0.0744);

        return (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#7c6fff]/10 rounded-lg text-[#7c6fff]">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 font-sora">
                    Net Profit / Loss Bridge (Official Management P&L)
                  </h2>
                  <p className="text-xs text-slate-500 font-inter">
                    Gross revenue reconciled with sales returns credit notes and period operating expenses
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate("returns")}
                  className="text-xs font-bold text-[#7c6fff] hover:underline flex items-center gap-1 font-sora"
                >
                  <span>Returns Analysis ({formatPercent(returnRate)})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Waterfall Flow Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* Step 1: Gross Sales */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sora">
                  1. Gross Sales
                </span>
                <div className="mt-1">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-sora truncate">
                    {formatCurrency(grossSales, currency, true)}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                    Incl. empties
                  </span>
                </div>
              </div>

              {/* Step 2: Less Returns */}
              <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider font-sora">
                  2. Less Returns
                </span>
                <div className="mt-1">
                  <div className="text-xs sm:text-sm font-extrabold text-purple-700 font-sora truncate">
                    −{formatCurrency(salesReturns, currency, true)}
                  </div>
                  <span className="text-[9px] text-purple-600 font-medium block mt-0.5">
                    Rate: {formatPercent(returnRate)}
                  </span>
                </div>
              </div>

              {/* Step 3: Net Sales */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-sora">
                  3. Net Sales
                </span>
                <div className="mt-1">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-sora truncate">
                    {formatCurrency(netSales, currency, true)}
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                    Gross − Returns
                  </span>
                </div>
              </div>

              {/* Step 4: Less Cost */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sora">
                  4. Total Cost
                </span>
                <div className="mt-1">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 font-sora truncate">
                    −{formatCurrency(embeddedCost, currency, true)}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                    Invoice-embedded
                  </span>
                </div>
              </div>

              {/* Step 5: Net Gross Profit / Loss */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${netGrossLoss < 0 ? "bg-rose-50/60 border-rose-200" : "bg-emerald-50/60 border-emerald-200"}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider font-sora ${netGrossLoss < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  5. Net Gross Loss
                </span>
                <div className="mt-1">
                  <div className={`text-xs sm:text-sm font-extrabold font-sora truncate ${netGrossLoss < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {formatCurrency(netGrossLoss, currency, true)}
                  </div>
                  <span className={`text-[9px] font-medium block mt-0.5 ${netGrossLoss < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    Margin: {formatPercent(netGrossMarginPct)}
                  </span>
                </div>
              </div>

              {/* Step 6: Operating Expenses */}
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-sora">
                  6. Op. Expenses
                </span>
                <div className="mt-1">
                  <div className="text-xs sm:text-sm font-extrabold text-amber-900 font-sora truncate">
                    −{formatCurrency(opExpenses, currency, true)}
                  </div>
                  <span className="text-[9px] text-amber-700 font-medium block mt-0.5">
                    Day book vouchers
                  </span>
                </div>
              </div>

              {/* Step 7: Net Operating Loss */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${netOpLoss < 0 ? "bg-rose-100/70 border-rose-300" : "bg-emerald-100/70 border-emerald-300"}`}>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider font-sora ${netOpLoss < 0 ? "text-rose-900" : "text-emerald-900"}`}>
                  7. Net P&L
                </span>
                <div className="mt-1">
                  <div className={`text-xs sm:text-sm font-black font-sora truncate ${netOpLoss < 0 ? "text-rose-900" : "text-emerald-900"}`}>
                    {formatCurrency(netOpLoss, currency, true)}
                  </div>
                  <span className={`text-[9px] font-bold block mt-0.5 ${netOpLoss < 0 ? "text-rose-800" : "text-emerald-800"}`}>
                    Period bottom line
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. Period-Over-Period Comparison Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#7c6fff]/10 rounded-lg text-[#7c6fff]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sora">
                Comparative Analytics ({granularity.toUpperCase()})
              </h2>
              <p className="text-xs text-slate-500">Benchmark variance across key metrics</p>
            </div>
          </div>

          {/* Granularity Toggle */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  granularity === g
                    ? "bg-[#7c6fff] text-white font-sora shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {compLoading ? (
          <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium">Computing comparison deltas...</span>
          </div>
        ) : comparison ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
              <span>Baseline: {comparison.period_a_label}</span>
              <span>Comparison: {comparison.period_b_label}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Revenue Diff */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Revenue Delta</span>
                <div className={`text-base font-bold mt-1 ${comparison.summary.revenue.absolute_change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.revenue.formatted}
                </div>
              </div>

              {/* Profit Diff */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Gross Profit Delta</span>
                <div className={`text-base font-bold mt-1 ${comparison.summary.gross_profit.absolute_change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.gross_profit.formatted}
                </div>
              </div>

              {/* Margin Diff */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Margin Delta</span>
                <div className={`text-base font-bold mt-1 ${comparison.summary.margin_pct.diff_pct_points >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.margin_pct.formatted}
                </div>
              </div>

              {/* Invoices Diff */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Invoices Delta</span>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {comparison.summary.invoices.formatted}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Select a granularity to calculate comparison metrics.
          </div>
        )}
      </div>

      {/* 3. Executive Action Cards Grid (3 Columns on Desktop) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Key Audit Findings & Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pricing Leaks Callout */}
          <div
            onClick={() => onNavigate("pricing")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full">
                  {belowFloorCount} items
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Below-Floor Pricing</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Total recoverable leakage:{" "}
                  <span className="font-semibold text-rose-700 block mt-0.5">
                    {formatCurrency(totalLeakOpportunity, currency, true)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 text-xs font-semibold text-rose-700">
              <span>View pricing audit</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Dominant Product Concentration */}
          <div
            onClick={() => onNavigate("products")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                  <Package className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {dominant ? formatPercent(dominant.pct_of_total) : "0%"} share
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Product Concentration</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-800">{dominant?.product_raw || "Top SKU"}</span> accounts for{" "}
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {formatCurrency(dominant?.revenue || 0, currency, true)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 text-xs font-semibold text-amber-700">
              <span>View products</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Loss-Making Customers */}
          <div
            onClick={() => onNavigate("customers")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-700">
                  <Users className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full">
                  {lossCustomersCount} accounts
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Negative Margin Accounts</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Top loss customer:{" "}
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {lossCustomers[0]?.customer || "None"} ({formatCurrency(lossCustomers[0]?.gross_profit || 0, currency, true)})
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 text-xs font-semibold text-rose-700">
              <span>View customers</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
