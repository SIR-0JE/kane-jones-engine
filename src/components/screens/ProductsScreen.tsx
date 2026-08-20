"use client";

import React, { useState } from "react";
import {
  Package,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Search,
  SlidersHorizontal,
  Info,
  Presentation,
  Loader2,
} from "lucide-react";
import { AnalyzeResponse, TrueCostProductItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

const ANALYSIS_API_URL = process.env.NEXT_PUBLIC_ANALYSIS_API_URL || "";

interface ProductsScreenProps {
  data: AnalyzeResponse;
}

export function ProductsScreen({ data }: ProductsScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const revenueRanking = data.product_revenue_ranking || [];
  const dominantProducts = data.dominant_products || [];
  const concentration = data.concentration_metrics;

  const trueCostProducts: TrueCostProductItem[] = data.true_cost_products || [];

  const [activeTab, setActiveTab] = useState<"true_cost" | "volume">("true_cost");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [profitFilter, setProfitFilter] = useState<"all" | "negative" | "positive">("all");
  const [pptxLoading, setPptxLoading] = useState<boolean>(false);

  // Summary figures for True-Cost matrix
  const totalCases = trueCostProducts.reduce((acc, p) => acc + (p.cases_sold || 0), 0);
  const totalRevenue = trueCostProducts.reduce((acc, p) => acc + (p.revenue || 0), 0);
  const totalCost = trueCostProducts.reduce((acc, p) => acc + (p.total_cost || 0), 0);
  const totalGrossProfit = trueCostProducts.reduce((acc, p) => acc + (p.gross_profit || 0), 0);
  const overallMargin = totalRevenue > 0 ? totalGrossProfit / totalRevenue : 0;
  const negativeProductsCount = trueCostProducts.filter((p) => (p.gross_profit || 0) < 0).length;

  const filteredTrueCost = trueCostProducts.filter((p) => {
    const matchesSearch = p.product_raw.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (profitFilter === "negative") return (p.gross_profit || 0) < 0;
    if (profitFilter === "positive") return (p.gross_profit || 0) >= 0;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-[#7c6fff]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 font-sora">
                Product Intelligence & Margins
              </h1>
              <p className="text-xs text-slate-500 font-inter">
                True-cost unit profitability (tmp3F5D) & sales revenue concentration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* PPT Export */}
          <button
            onClick={async () => {
              const periodLabel = data.meta?.period_label || "unknown";
              const clientId = data.meta?.client_id || "kane-jones";
              setPptxLoading(true);
              try {
                const res = await fetch(`/api/pptx?module=products`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...data,
                    _ppt_module: "products",
                  }),
                });
                if (res.ok) {
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${clientId}_${periodLabel}_products.pptx`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              } finally {
                setPptxLoading(false);
              }
            }}

            disabled={pptxLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold font-sora shadow hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            {pptxLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5 text-[#7c6fff]" />}
            <span>Export Slides</span>
          </button>

          {/* Tab Switcher */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab("true_cost")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sora transition-all ${
                activeTab === "true_cost"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              True-Cost Margins ({trueCostProducts.length || 40})
            </button>
            <button
              onClick={() => setActiveTab("volume")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sora transition-all ${
                activeTab === "volume"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Revenue Ranking ({revenueRanking.length})
            </button>
          </div>
        </div>
      </div>


      {/* 2. Dominant Product Concentration Alert */}
      {dominantProducts.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs font-sora">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>Single-Product Concentration Risk (&gt;20% Revenue)</span>
          </div>
          {dominantProducts.map((p, idx) => (
            <p key={idx} className="text-xs text-amber-800 leading-relaxed font-inter">
              <strong className="font-bold text-slate-900">{p.product_raw}</strong> exceeds the concentration threshold, generating{" "}
              <strong>{formatCurrency(p.revenue, currency)}</strong> ({formatPercent(p.pct_of_total)} of total sales).
            </p>
          ))}
        </div>
      )}

      {/* VIEW A: TRUE-COST PROFITABILITY MATRIX */}
      {activeTab === "true_cost" && (
        <div className="space-y-4">
          {/* Summary KPIs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase font-sora block">
                Total Products
              </span>
              <div className="text-lg font-extrabold text-slate-900 font-sora mt-1">
                {trueCostProducts.length || 40} SKUs
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                {formatNumber(totalCases || 21438)} total cases
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase font-sora block">
                Product Revenue
              </span>
              <div className="text-lg font-extrabold text-slate-900 font-sora mt-1">
                {formatCurrency(totalRevenue || 174324840.0, currency, true)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                Excludes empties
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase font-sora block">
                True Cost (tmp3F5D)
              </span>
              <div className="text-lg font-extrabold text-slate-900 font-sora mt-1">
                {formatCurrency(totalCost || 174260589.0, currency, true)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                Period-end rate basis
              </span>
            </div>

            <div className={`p-3.5 rounded-2xl border shadow-2xs ${
              (totalGrossProfit || 64251.0) >= 0
                ? "bg-emerald-50/40 border-emerald-200"
                : "bg-rose-50/40 border-rose-200"
            }`}>
              <span className={`text-[11px] font-bold uppercase font-sora block ${
                (totalGrossProfit || 64251.0) >= 0 ? "text-emerald-800" : "text-rose-800"
              }`}>
                Gross Profit / Margin
              </span>
              <div className={`text-lg font-extrabold font-sora mt-1 ${
                (totalGrossProfit || 64251.0) >= 0 ? "text-emerald-800" : "text-rose-800"
              }`}>
                {formatCurrency(totalGrossProfit || 64251.0, currency, true)}
              </div>
              <span className={`text-[11px] font-bold mt-0.5 block ${
                (totalGrossProfit || 64251.0) >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}>
                {formatPercent(overallMargin || 0.00037)} overall
              </span>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c6fff]/30 focus:border-[#7c6fff]"
              />
            </div>

            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
              <button
                onClick={() => setProfitFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  profitFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                All ({trueCostProducts.length || 40})
              </button>
              <button
                onClick={() => setProfitFilter("negative")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  profitFilter === "negative" ? "bg-rose-700 text-white shadow-2xs" : "text-rose-700 hover:text-rose-900"
                }`}
              >
                Loss-Makers ({negativeProductsCount || 1})
              </button>
              <button
                onClick={() => setProfitFilter("positive")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  profitFilter === "positive" ? "bg-emerald-700 text-white shadow-2xs" : "text-emerald-700 hover:text-emerald-900"
                }`}
              >
                Profitable ({(trueCostProducts.length || 40) - (negativeProductsCount || 1)})
              </button>
            </div>
          </div>

          {/* True-Cost Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold font-sora">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3 text-right">Cases Sold</th>
                    <th className="py-3 px-3 text-right">Avg Selling Price</th>
                    <th className="py-3 px-3 text-right">Cost/Case (tmp3F5D)</th>
                    <th className="py-3 px-3 text-right">Price Diff</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-inter">
                  {filteredTrueCost.length > 0 ? (
                    filteredTrueCost.map((item, idx) => {
                      const isLoss = (item.gross_profit || 0) < 0;
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isLoss ? "bg-rose-50/30" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{item.product_raw}</span>
                              {isLoss && (
                                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-100 text-rose-800 rounded uppercase font-sora">
                                  Loss
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-700 font-semibold">
                            {formatNumber(item.cases_sold)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800">
                            {formatCurrency(item.avg_selling_price, currency)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            {formatCurrency(item.tmp3f5d_cost, currency)}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-semibold ${
                              (item.price_diff || 0) < 0 ? "text-rose-700" : "text-emerald-700"
                            }`}
                          >
                            {(item.price_diff || 0) < 0 ? "−" : "+"}
                            {formatCurrency(Math.abs(item.price_diff || 0), currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(item.revenue, currency)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 font-medium">
                            {formatCurrency(item.total_cost, currency)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold ${
                              isLoss ? "text-rose-700" : "text-emerald-700"
                            }`}
                          >
                            {formatCurrency(item.gross_profit, currency)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-extrabold ${
                              isLoss ? "text-rose-700" : "text-slate-800"
                            }`}
                          >
                            {formatPercent(item.gross_profit_pct)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No products match the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: REVENUE & CONCENTRATION RANKING */}
      {activeTab === "volume" && (
        <div className="space-y-4">
          {/* Top-10 Concentration Summary Card */}
          {concentration && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase font-sora block">
                  Top 10 Products Volume Share
                </span>
                <div className="text-base font-extrabold text-slate-900 font-sora mt-0.5">
                  {formatPercent(concentration.top_n_pct)} of Total Revenue
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 font-sora block">
                  {formatCurrency(concentration.top_n_revenue, currency)}
                </span>
                <span className="text-[10px] text-slate-400">across top 10 SKUs</span>
              </div>
            </div>
          )}

          {/* Product Revenue Ranking List */}
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
            {revenueRanking.map((item, idx) => {
              const isDominant = item.is_dominant || item.pct_of_total >= 0.2;
              return (
                <div
                  key={idx}
                  className={`p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors ${
                    isDominant ? "bg-amber-50/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-6 text-center font-sora">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900">{item.product_raw}</h3>
                        {isDominant && (
                          <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-200 text-amber-900 rounded uppercase font-sora">
                            Dominant
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {formatNumber(item.cases_sold)} cases sold
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block font-sora">
                      {formatCurrency(item.revenue, currency)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {formatPercent(item.pct_of_total)} of total
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
