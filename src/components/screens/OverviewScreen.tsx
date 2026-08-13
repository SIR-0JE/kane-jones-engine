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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* Download Report button row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-900 font-sora">Overview</h1>
          <p className="text-xs text-slate-500">{meta?.audit_title || meta?.period_label || "Audit"}</p>
        </div>
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
          {pdfLoading ? "Generating…" : "Download Report"}
        </button>
      </div>

      {/* 1. Core KPIs Grid (4 Columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Revenue</span>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mt-1 tracking-tight truncate font-sora">
            {formatCurrency(meta.total_revenue, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {formatNumber(meta.total_invoices)} invoices
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Gross Profit</span>
          <div className={`text-lg sm:text-xl lg:text-2xl font-bold mt-1 tracking-tight truncate font-sora ${meta.total_gross_profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatCurrency(meta.total_gross_profit, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Margin: <span className="font-semibold text-slate-700">{formatPercent(meta.overall_margin_pct)}</span>
          </div>
        </div>

        {/* Recoverable Leakage */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 block">Pricing Leakage</span>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-rose-700 mt-1 tracking-tight truncate font-sora">
            {formatCurrency(totalLeakOpportunity, currency)}
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

      {/* 2. Period-Over-Period Comparison Section */}
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
                    {formatCurrency(totalLeakOpportunity, currency)}
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
                    {formatCurrency(dominant?.revenue || 0, currency)}
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
                    {lossCustomers[0]?.customer || "None"} ({formatCurrency(lossCustomers[0]?.gross_profit || 0, currency)})
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
