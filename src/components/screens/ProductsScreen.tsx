"use client";

import React from "react";
import { Package, AlertCircle, TrendingUp, BarChart2 } from "lucide-react";
import { AnalyzeResponse } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface ProductsScreenProps {
  data: AnalyzeResponse;
}

export function ProductsScreen({ data }: ProductsScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const products = data.product_revenue_ranking || [];
  const dominantProducts = data.dominant_products || [];
  const concentration = data.concentration_metrics;

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* 1. Dominant Product Concentration Alert */}
      {dominantProducts.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>Single-Product Concentration Risk</span>
          </div>
          {dominantProducts.map((p, idx) => (
            <p key={idx} className="text-xs text-amber-800 leading-relaxed">
              <strong className="font-bold text-slate-900">{p.product_raw}</strong> exceeds the 20% concentration threshold, generating{" "}
              <strong>{formatCurrency(p.revenue, currency)}</strong> ({formatPercent(p.pct_of_total)} of depot sales).
            </p>
          ))}
        </div>
      )}

      {/* 2. Top-10 Concentration Summary Card */}
      {concentration && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Top 10 Products Volume Share</span>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {formatPercent(concentration.top_n_pct)} of Total Revenue
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800">{formatCurrency(concentration.top_n_revenue, currency)}</span>
            <span className="block text-[10px] text-slate-400">across top 10 SKUs</span>
          </div>
        </div>
      )}

      {/* 3. Product Revenue Ranking Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Product Revenue Ranking ({products.length})
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {products.map((item, idx) => {
            const isDominant = item.is_dominant || (item.pct_of_total >= 0.20);
            return (
              <div key={idx} className={`p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors ${isDominant ? "bg-amber-50/30" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 text-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-900">{item.product_raw}</h3>
                      {isDominant && (
                        <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-200 text-amber-900 rounded uppercase">
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
                  <span className="text-xs font-bold text-slate-900 block">
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
    </div>
  );
}
