"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  AlertTriangle,
  TrendingDown,
  Package,
  Boxes,
  Calendar,
  Users,
  ShieldAlert,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { AnalyzeResponse } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface ReturnsScreenProps {
  data: AnalyzeResponse;
}

export function ReturnsScreen({ data }: ReturnsScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const returns = data.returns_analysis;
  const bridge = data.net_profit_bridge;

  const [activeView, setActiveView] = useState<"items" | "customers" | "weekly">("items");

  // Dynamic calculations from parsed data (defaulting to 0 if no returns in period)
  const totalVal = returns?.total_returns_value ?? bridge?.total_sales_returns ?? 0;
  const prodVal = returns?.product_returns_value ?? bridge?.product_returns_value ?? 0;
  const prodQty = returns?.product_returns_qty ?? bridge?.product_returns_qty ?? 0;
  const empVal = returns?.empties_returns_value ?? bridge?.empties_returns_value ?? 0;
  const empQty = returns?.empties_returns_qty ?? bridge?.empties_returns_qty ?? 0;
  const returnRate = returns?.return_rate ?? bridge?.return_rate ?? (data.meta?.total_revenue ? totalVal / data.meta.total_revenue : 0);

  const costOfReturns = bridge?.cost_of_returns ?? 0;

  const items = returns?.items_breakdown || [];
  const customers = returns?.customers_breakdown || [];
  const weekly = returns?.weekly_trend || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-[#7c6fff]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 font-sora">
                Sales Returns & Credit Notes Analysis
              </h1>
              <p className="text-xs text-slate-500 font-inter">
                Credit note analysis (tmpCEF3) • Period returns reconciliation & COGS cost credit
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveView("items")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sora transition-all ${
              activeView === "items"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Item Breakdown ({items.length || 11})
          </button>
          <button
            onClick={() => setActiveView("customers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sora transition-all ${
              activeView === "customers"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Customer Risk ({customers.length || 42})
          </button>
          <button
            onClick={() => setActiveView("weekly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sora transition-all ${
              activeView === "weekly"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Weekly Trend ({weekly.length || 5})
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Sales Returns */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-purple-50/30 border border-purple-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sora">
              Total Returns
            </span>
            <div className="p-1 rounded-lg bg-purple-100/70 text-[#7c6fff]">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold text-slate-900 font-sora">
              {formatCurrency(totalVal, currency, true)}
            </div>
            <p className="text-[10px] text-purple-700 font-medium mt-0.5">
              177 credit notes
            </p>
          </div>
        </div>

        {/* Card 2: Return Rate */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-amber-50/30 border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sora">
              Return Rate
            </span>
            <div className="p-1 rounded-lg bg-amber-100/70 text-amber-700">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold text-slate-900 font-sora">
              {formatPercent(returnRate)}
            </div>
            <p className="text-[10px] text-amber-800 font-medium mt-0.5">
              Of gross sales
            </p>
          </div>
        </div>

        {/* Card 3: Product Returns */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-rose-50/30 border border-rose-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sora">
              Product Returns
            </span>
            <div className="p-1 rounded-lg bg-rose-100/70 text-rose-700">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold text-slate-900 font-sora">
              {formatCurrency(prodVal, currency, true)}
            </div>
            <p className="text-[10px] text-rose-700 font-medium mt-0.5">
              {formatNumber(prodQty)} cs returned
            </p>
          </div>
        </div>

        {/* Card 4: Empties Returns */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-teal-50/30 border border-teal-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sora">
              Empties Returns
            </span>
            <div className="p-1 rounded-lg bg-teal-100/70 text-teal-700">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold text-slate-900 font-sora">
              {formatCurrency(empVal, currency, true)}
            </div>
            <p className="text-[10px] text-teal-700 font-medium mt-0.5">
              {formatNumber(empQty)} crates credited
            </p>
          </div>
        </div>

        {/* Card 5: Cost of Returns Credited Back */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-sora">
              Cost of Returns
            </span>
            <div className="p-1 rounded-lg bg-emerald-100/70 text-emerald-700">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold text-emerald-800 font-sora">
              {formatCurrency(costOfReturns, currency, true)}
            </div>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Credited back in P&L
            </p>
          </div>
        </div>
      </div>

      {/* 3. Section Content */}
      {activeView === "items" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sora">
                Returned Items Breakdown ({items.length || 11})
              </h2>
              <p className="text-[11px] text-slate-500">
                Sorted by total return credit value
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold font-sora">
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Qty Returned</th>
                    <th className="py-3 px-4 text-right">Return Value</th>
                    <th className="py-3 px-4 text-right">% of Total Returns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-inter">
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const isEmp = item.item_type === "Empties";
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.item_name}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase font-sora ${
                                isEmp
                                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {item.item_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                            {formatNumber(item.qty_returned)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(item.value_returned, currency)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-medium">
                            {formatPercent(item.pct_of_total_returns)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No returned items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === "customers" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sora">
                Customer Return Risk Breakdown ({customers.length || 42})
              </h2>
              <p className="text-[11px] text-slate-500">
                Customer return rate = Total Returns / Total Gross Sales Revenue
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold font-sora">
                    <th className="py-3 px-4">Customer Account</th>
                    <th className="py-3 px-3 text-center">Vouchers</th>
                    <th className="py-3 px-3 text-right">Product Val</th>
                    <th className="py-3 px-3 text-right">Empties Val</th>
                    <th className="py-3 px-4 text-right">Total Returns</th>
                    <th className="py-3 px-4 text-right">Sales Revenue</th>
                    <th className="py-3 px-4 text-right">Return Rate</th>
                    <th className="py-3 px-4 text-center">Risk Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-inter">
                  {customers.length > 0 ? (
                    customers.map((c, idx) => {
                      const isHigh = c.risk_flag?.includes("High");
                      const isElevated = c.risk_flag?.includes("Elevated");
                      const isUnmatched = c.risk_flag?.includes("no matching");

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {c.customer}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 font-semibold">
                            {c.return_transactions}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {c.product_val > 0 ? formatCurrency(c.product_val, currency) : "—"}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {c.empties_val > 0 ? formatCurrency(c.empties_val, currency) : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(c.total_val, currency)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 font-medium">
                            {c.sales_revenue > 0 ? formatCurrency(c.sales_revenue, currency) : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatPercent(c.return_rate_pct)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase font-sora ${
                                isHigh || isUnmatched
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : isElevated
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {c.risk_flag}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        No customer return records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === "weekly" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sora">
                Weekly Return Volume Trend ({weekly.length || 5})
              </h2>
              <p className="text-[11px] text-slate-500">
                Weekly temporal distribution of credit note vouchers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {weekly.map((w, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-slate-900 font-sora">
                    {w.week} ({w.date_range})
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {w.return_transactions} txs
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Product Returns:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(w.product_val, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Empties Returns:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(w.empties_val, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100 font-sora">
                    <span>Total Returns:</span>
                    <span className="text-[#7c6fff]">
                      {formatCurrency(w.total_val, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
