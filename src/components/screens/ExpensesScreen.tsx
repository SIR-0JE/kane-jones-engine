"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  AlertTriangle,
  TrendingDown,
  Search,
  PieChart,
  ShieldAlert,
  ArrowRight,
  Flame,
  CheckCircle2,
  DollarSign,
  Building,
  Truck,
  Fuel,
  Wrench,
  Printer,
  Users,
  Wallet,
} from "lucide-react";
import { AnalyzeResponse, ExpenseItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface ExpensesScreenProps {
  data: AnalyzeResponse;
}

export function ExpensesScreen({ data }: ExpensesScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const expensesAnalysis = data.expenses_analysis;
  const bridge = data.net_profit_bridge;

  const totalExpenses = expensesAnalysis?.total_expenses ?? bridge?.total_operating_expenses ?? 0;
  const netSalesRevenue = bridge?.net_sales_revenue ?? data.meta?.total_revenue ?? 0;
  const expenseRatio = netSalesRevenue > 0 ? totalExpenses / netSalesRevenue : 0;

  const categories: ExpenseItem[] = useMemo(() => {
    if (expensesAnalysis?.categories && expensesAnalysis.categories.length > 0) {
      return [...expensesAnalysis.categories].sort((a, b) => b.amount - a.amount);
    }
    return [];
  }, [expensesAnalysis]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<"all" | "high_burn" | "moderate" | "minor">("all");

  const largestCategory = categories[0] || null;
  const largestShare = totalExpenses > 0 && largestCategory ? largestCategory.amount / totalExpenses : 0;

  // Filter categories
  const filteredCategories = useMemo(() => {
    return categories.filter((item) => {
      const share = totalExpenses > 0 ? item.amount / totalExpenses : 0;
      if (filterTier === "high_burn" && share < 0.15) return false;
      if (filterTier === "moderate" && (share < 0.05 || share >= 0.15)) return false;
      if (filterTier === "minor" && share >= 0.05) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [categories, filterTier, searchQuery, totalExpenses]);

  // Helper to pick category icon
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("generator") || lower.includes("diesel") || lower.includes("fuel")) return Fuel;
    if (lower.includes("van") || lower.includes("truck") || lower.includes("transport") || lower.includes("driver")) return Truck;
    if (lower.includes("forklift") || lower.includes("repair") || lower.includes("maint")) return Wrench;
    if (lower.includes("salary") || lower.includes("wage") || lower.includes("advance")) return Wallet;
    if (lower.includes("warehouse") || lower.includes("building") || lower.includes("rent")) return Building;
    if (lower.includes("print") || lower.includes("stationery")) return Printer;
    return Receipt;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 font-sora">
                Monthly Operating Expenses
              </h1>
              <p className="text-xs text-slate-500 font-inter">
                Breakdown of overhead, warehouse logistics, salaries, fuel, and payment vouchers
              </p>
            </div>
          </div>
        </div>

        <div className="text-right bg-rose-50/70 border border-rose-200 px-4 py-2 rounded-xl">
          <span className="text-[10px] font-bold text-rose-700 uppercase font-sora block">Total OpEx Recorded</span>
          <span className="text-base sm:text-lg font-black text-rose-700 font-sora">
            −{formatCurrency(totalExpenses, currency, false)}
          </span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Expenses */}
        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-sora block">
            1. Total OpEx
          </span>
          <div className="text-lg sm:text-xl font-extrabold text-rose-700 mt-1 font-sora truncate">
            −{formatCurrency(totalExpenses, currency, true)}
          </div>
          <span className="text-[11px] text-rose-600 font-medium block mt-0.5">
            Deducted from gross profit
          </span>
        </div>

        {/* Expense % of Net Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sora block">
            2. OpEx % of Net Sales
          </span>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 font-sora truncate">
            {formatPercent(expenseRatio)}
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            On {formatCurrency(netSalesRevenue, currency, true)} net sales
          </span>
        </div>

        {/* Largest Category */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sora block">
            3. Largest Outflow
          </span>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-sora truncate">
            {largestCategory?.category || "N/A"}
          </div>
          <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
            {formatCurrency(largestCategory?.amount || 0, currency, true)} ({formatPercent(largestShare)})
          </span>
        </div>

        {/* Categories Audited */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sora block">
            4. Expense Lines
          </span>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 font-sora truncate">
            {categories.length} Categories
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            Parsed from July total Expenses
          </span>
        </div>
      </div>

      {/* High-Burn Alert Banner if largest category exceeds 30% */}
      {largestCategory && largestShare > 0.3 && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <div className="p-2 bg-amber-100 rounded-lg shrink-0 text-amber-800">
            <Flame className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-amber-950 font-sora">
              High Concentration Alert: {largestCategory.category} represents {formatPercent(largestShare)} of total monthly expenses
            </h4>
            <p className="text-amber-800 leading-relaxed font-inter">
              Out of {formatCurrency(totalExpenses, currency, false)} in recorded overheads, {largestCategory.category} consumed {formatCurrency(largestCategory.amount, currency, false)}. Review warehouse handling and operational log vouchers for optimization opportunities.
            </p>
          </div>
        </div>
      )}

      {/* Category Breakdown Progress Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sora">
            Top Expense Categories by Share
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Ranked by total monetary outflow
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.slice(0, 6).map((item, idx) => {
            const share = totalExpenses > 0 ? item.amount / totalExpenses : 0;
            const Icon = getCategoryIcon(item.category);
            const isHighBurn = share >= 0.15;

            return (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isHighBurn ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 font-sora line-clamp-1">{item.category}</h3>
                      <span className="text-[10px] text-slate-400 font-inter">Rank #{idx + 1}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-black font-sora ${isHighBurn ? "text-rose-700" : "text-slate-900"}`}>
                    {formatCurrency(item.amount, currency, false)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Share of OpEx</span>
                    <span className="font-bold text-slate-800 font-sora">{formatPercent(share)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isHighBurn ? "bg-rose-500" : share >= 0.05 ? "bg-amber-500" : "bg-[#7c6fff]"
                      }`}
                      style={{ width: `${Math.min(share * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Searchable Categories Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          {/* Tier Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setFilterTier("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                filterTier === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Categories ({categories.length})
            </button>
            <button
              onClick={() => setFilterTier("high_burn")}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                filterTier === "high_burn"
                  ? "bg-rose-700 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              High Burn (&ge;15%)
            </button>
            <button
              onClick={() => setFilterTier("moderate")}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                filterTier === "moderate"
                  ? "bg-amber-700 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Moderate (5–15%)
            </button>
            <button
              onClick={() => setFilterTier("minor")}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                filterTier === "minor"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Minor (&lt;5%)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search category name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold font-sora">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Expense Category</th>
                  <th className="py-3 px-4 text-right">Amount Deducted</th>
                  <th className="py-3 px-4 text-right">% of Total OpEx</th>
                  <th className="py-3 px-4 text-right">% of Net Sales</th>
                  <th className="py-3 px-4 text-center">Budget Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-inter">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No expense categories match the search or filter query.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((item, idx) => {
                    const share = totalExpenses > 0 ? item.amount / totalExpenses : 0;
                    const netSalesPct = netSalesRevenue > 0 ? item.amount / netSalesRevenue : 0;
                    const isHigh = share >= 0.15;
                    const isMod = share >= 0.05 && share < 0.15;
                    const Icon = getCategoryIcon(item.category);

                    return (
                      <tr key={idx} className={`hover:bg-slate-50/70 transition-colors ${isHigh ? "bg-rose-50/20" : ""}`}>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-md ${isHigh ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-slate-900">{item.category}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-700 font-sora">
                          −{formatCurrency(item.amount, currency, false)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800 font-sora">
                          {formatPercent(share)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          {formatPercent(netSalesPct)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isHigh
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : isMod
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isHigh ? "High Outflow" : isMod ? "Moderate" : "Controlled"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredCategories.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 font-sora">
                    <td colSpan={2} className="py-3 px-4">
                      Total Filtered Outflows
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-700">
                      −{formatCurrency(filteredCategories.reduce((acc, c) => acc + c.amount, 0), currency, false)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {totalExpenses > 0 ? formatPercent(filteredCategories.reduce((acc, c) => acc + c.amount, 0) / totalExpenses) : "100%"}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
