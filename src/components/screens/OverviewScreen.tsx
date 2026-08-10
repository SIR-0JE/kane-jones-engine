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
} from "lucide-react";
import { AnalyzeResponse, CompareResponse } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber, fetchComparison } from "@/lib/api";

interface OverviewScreenProps {
  data: AnalyzeResponse;
  onNavigate: (tab: "pricing" | "products" | "customers" | "quality") => void;
}

export function OverviewScreen({ data, onNavigate }: OverviewScreenProps) {
  const meta = data.meta;
  const currency = meta?.currency_symbol || "₦";

  // Comparison toggle state
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [compLoading, setCompLoading] = useState<boolean>(false);

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
  const totalLeakOpportunity = belowFloorLeaks.reduce((acc, item) => acc + (item.revenue_opportunity || 0), 0);
  const dominant = data.dominant_products?.[0];
  const lossCustomers = data.loss_making_customers || [];

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* 1. Core KPIs Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Revenue */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">Total Revenue</span>
          <div className="text-lg font-bold text-slate-900 mt-1 tracking-tight truncate">
            {formatCurrency(meta.total_revenue, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {formatNumber(meta.total_invoices)} invoices
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block">Gross Profit</span>
          <div className={`text-lg font-bold mt-1 tracking-tight truncate ${meta.total_gross_profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatCurrency(meta.total_gross_profit, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Margin: <span className="font-semibold text-slate-700">{formatPercent(meta.overall_margin_pct)}</span>
          </div>
        </div>
      </div>

      {/* 2. Period-Over-Period Comparison Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Period Comparison
            </h2>
          </div>

          {/* Granularity Toggle */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  granularity === g
                    ? "bg-white text-slate-900 shadow-none"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {compLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Computing comparison deltas...</span>
          </div>
        ) : comparison ? (
          <div className="space-y-3">
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between border-b border-slate-100 pb-2">
              <span>Comparing:</span>
              <span className="font-semibold text-slate-800">
                {comparison.period_a_label} <span className="text-slate-400 font-normal">vs</span> {comparison.period_b_label}
              </span>
            </div>

            {/* Delta Metrics Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Revenue Delta */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium block">Revenue Delta</span>
                <span className={`text-xs font-bold block mt-0.5 ${comparison.summary.revenue.pct_change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.revenue.formatted}
                </span>
              </div>

              {/* Profit Delta */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium block">Gross Profit</span>
                <span className={`text-xs font-bold block mt-0.5 ${comparison.summary.gross_profit.absolute_change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.gross_profit.formatted}
                </span>
              </div>

              {/* Margin Points */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium block">Margin Shift</span>
                <span className={`text-xs font-bold block mt-0.5 ${comparison.summary.margin_pct.diff_pct_points >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.margin_pct.formatted}
                </span>
              </div>

              {/* Invoices Delta */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium block">Invoices</span>
                <span className={`text-xs font-bold block mt-0.5 ${comparison.summary.invoices.absolute_change >= 0 ? "text-slate-800" : "text-slate-600"}`}>
                  {comparison.summary.invoices.formatted}
                </span>
              </div>
            </div>

            {/* Executive Highlights */}
            {comparison.highlights && comparison.highlights.length > 0 && (
              <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-800 block">Executive Highlights:</span>
                <ul className="text-xs text-slate-600 space-y-1">
                  {comparison.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-4 text-center">No comparison available.</div>
        )}
      </div>

      {/* 3. Executive Action Cards Grid */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Key Audit Findings
        </h2>

        {/* Pricing Leaks Callout */}
        <div
          onClick={() => onNavigate("pricing")}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors flex items-center justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-700 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900">Below-Floor Pricing Leaks</h3>
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                  {belowFloorLeaks.length} items
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total recoverable leakage: <span className="font-semibold text-rose-700">{formatCurrency(totalLeakOpportunity, currency)}</span>
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Dominant Product Concentration */}
        {dominant && (
          <div
            onClick={() => onNavigate("products")}
            className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-700 shrink-0 mt-0.5">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900">Product Concentration Risk</h3>
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                    {formatPercent(dominant.pct_of_total)} share
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  <span className="font-semibold text-slate-800">{dominant.product_raw}</span> accounts for {formatCurrency(dominant.revenue, currency)}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        )}

        {/* Loss-Making Customers */}
        {lossCustomers.length > 0 && (
          <div
            onClick={() => onNavigate("customers")}
            className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 rounded-lg text-rose-700 shrink-0 mt-0.5">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900">Negative Margin Accounts</h3>
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                    {lossCustomers.length} accounts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Top loss customer: <span className="font-semibold text-slate-800">{lossCustomers[0].customer}</span> ({formatCurrency(lossCustomers[0].gross_profit, currency)})
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}
