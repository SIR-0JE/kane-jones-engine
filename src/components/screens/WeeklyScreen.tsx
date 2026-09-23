"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Receipt,
  Layers,
  Percent,
  Calendar,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Users,
  Package,
  Clock,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import {
  AnalyzeResponse,
  WeeklyFinancialsData,
  WeeklyReportItem,
  WeeklySummaryItem,
} from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface WeeklyScreenProps {
  data: AnalyzeResponse;
}

type BreakdownTab = "daily" | "products" | "customers" | "returns" | "expenses" | "all_weeks";

export function WeeklyScreen({ data }: WeeklyScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const wf: WeeklyFinancialsData | undefined = data.weekly_financials;
  const legacyWeekly: WeeklySummaryItem[] = data.weekly_summary || [];

  // Mode: calendar (Mon–Sun) vs trading (7-day depot blocks)
  const [weekMode, setWeekMode] = useState<"calendar" | "trading">("calendar");

  const weeksList: WeeklyReportItem[] = useMemo(() => {
    if (!wf) return [];
    return weekMode === "calendar" ? wf.calendar_weeks : wf.trading_weeks;
  }, [wf, weekMode]);

  // Selected week index (0-indexed into weeksList)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>("daily");

  const selectedWeek: WeeklyReportItem | null = useMemo(() => {
    if (!weeksList || weeksList.length === 0) return null;
    const clamped = Math.min(Math.max(0, selectedWeekIndex), weeksList.length - 1);
    return weeksList[clamped];
  }, [weeksList, selectedWeekIndex]);

  // Fallback for legacy snapshots lacking new weekly_financials structure
  if (!wf || weeksList.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sora">
              Weekly Performance Analysis
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-inter">
              Standard 7-day revenue progression and gross margin summary.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {legacyWeekly.map((w) => (
            <div key={w.week} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500">Week {w.week}</span>
              <div className="text-lg font-bold text-slate-900 font-sora">
                {formatCurrency(w.revenue, currency)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-inter">
                <span>Gross Profit:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(w.gross_profit, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-inter">
                <span>Margin:</span>
                <span className="font-semibold text-slate-800">{formatPercent(w.margin_pct)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pnl = selectedWeek?.pnl;
  const wow = selectedWeek?.wow;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sora">
              Weekly Financial Reporting
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#7c6fff]/10 text-[#7c6fff]">
              Phase 1 & 2 Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-inter">
            Full P&amp;L calculation chain, calendar/trading slicing, week-over-week deltas, and operational breakdowns.
          </p>
        </div>

        {/* Calendar vs Trading Week Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setWeekMode("calendar");
              setSelectedWeekIndex(0);
            }}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              weekMode === "calendar"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Calendar Weeks (Mon–Sun)
          </button>
          <button
            type="button"
            onClick={() => {
              setWeekMode("trading");
              setSelectedWeekIndex(0);
            }}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              weekMode === "trading"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Depot Trading Weeks
          </button>
        </div>
      </div>

      {/* 2. Week Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {weeksList.map((w, idx) => (
          <button
            key={w.week_number}
            type="button"
            onClick={() => setSelectedWeekIndex(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border ${
              selectedWeekIndex === idx
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{w.week_label}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setBreakdownTab("all_weeks")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
            breakdownTab === "all_weeks"
              ? "bg-[#7c6fff] text-white border-[#7c6fff] shadow-xs"
              : "bg-white text-slate-700 border-slate-200 hover:border-[#7c6fff]"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Compare All Weeks</span>
        </button>
      </div>

      {/* 3. Executive Narrative Insight */}
      {selectedWeek?.narrative_insight && (
        <div className="p-4 bg-linear-to-r from-[#7c6fff]/10 via-indigo-50/50 to-transparent border border-[#7c6fff]/20 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-[#7c6fff] text-white rounded-xl shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sora">
              Weekly Executive Commentary ({selectedWeek.week_label})
            </h2>
            <p className="text-xs text-slate-700 mt-1 font-inter leading-relaxed">
              {selectedWeek.narrative_insight}
            </p>
          </div>
        </div>
      )}

      {/* 4. Top WoW KPI Cards */}
      {pnl && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Gross Sales Revenue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Gross Sales Revenue</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-sora">
              {formatCurrency(pnl.gross_sales_revenue, currency)}
            </div>
            {wow && wow.has_previous ? (
              <div className="flex items-center gap-1 text-[11px] font-bold">
                {wow.revenue_diff_pct >= 0 ? (
                  <span className="text-emerald-600 inline-flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{wow.revenue_diff_pct.toFixed(1)}% WoW
                  </span>
                ) : (
                  <span className="text-rose-600 inline-flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {wow.revenue_diff_pct.toFixed(1)}% WoW
                  </span>
                )}
                <span className="text-slate-400 font-normal">vs Wk {wow.previous_week_number}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-inter">Base Period Week</span>
            )}
          </div>

          {/* Net Sales Revenue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Net Sales Revenue</span>
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-sora">
              {formatCurrency(pnl.net_sales_revenue, currency)}
            </div>
            <span className="text-[11px] text-slate-500 block font-inter">
              Less Returns: {formatCurrency(pnl.total_sales_returns, currency)}
            </span>
          </div>

          {/* Gross Profit & Margin */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Gross Profit (COGS Deducted)</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div
              className={`text-lg sm:text-xl font-extrabold font-sora ${
                pnl.gross_profit >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(pnl.gross_profit, currency)}
            </div>
            <div className="flex items-center justify-between text-[11px] font-inter">
              <span className="text-slate-500">Margin: {pnl.gross_margin_pct.toFixed(1)}%</span>
              {wow && wow.has_previous && (
                <span
                  className={`font-bold ${
                    wow.gross_margin_bps >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {wow.gross_margin_bps >= 0 ? "+" : ""}
                  {wow.gross_margin_bps.toFixed(0)} bps
                </span>
              )}
            </div>
          </div>

          {/* Net Operating Profit */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Net Operating Profit</span>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
            <div
              className={`text-lg sm:text-xl font-extrabold font-sora ${
                pnl.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(pnl.net_profit, currency)}
            </div>
            <span className="text-[11px] text-slate-500 block font-inter">
              Net Margin: {pnl.net_margin_pct.toFixed(1)}% after Opex
            </span>
          </div>
        </div>
      )}

      {/* 5. Full Weekly P&L Bridge & Waterfall */}
      {pnl && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sora">
                Weekly P&amp;L Bridge: {selectedWeek?.week_label}
              </h2>
              <p className="text-xs text-slate-500 font-inter">
                Exact calculation chain applied to the weekly window ({selectedWeek?.date_range.start} to{" "}
                {selectedWeek?.date_range.end}).
              </p>
            </div>
            <div className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {pnl.invoices_count} Invoices • {formatNumber(pnl.cases_sold)} Cases Sold
            </div>
          </div>

          {/* Table of calculation steps */}
          <div className="divide-y divide-slate-100 text-xs font-inter">
            {/* 1. Gross Revenue */}
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">1. Gross Sales Revenue</span>
                <span className="text-slate-400 block text-[11px]">Sum of invoiced goods</span>
              </div>
              <span className="font-extrabold text-slate-900 font-sora">
                {formatCurrency(pnl.gross_sales_revenue, currency)}
              </span>
            </div>

            {/* 2. Less Returns */}
            <div className="py-2.5 flex items-center justify-between text-rose-700">
              <div>
                <span className="font-bold">2. Less: Sales Returns</span>
                <span className="text-rose-500 block text-[11px]">
                  Product returns ({formatCurrency(pnl.product_returns_val, currency)}) + Empties returns (
                  {formatCurrency(pnl.empties_returns_val, currency)})
                </span>
              </div>
              <span className="font-extrabold font-sora">
                −{formatCurrency(pnl.total_sales_returns, currency)}
              </span>
            </div>

            {/* 3. Net Revenue */}
            <div className="py-2.5 flex items-center justify-between bg-slate-50/50 px-2 rounded-lg">
              <div>
                <span className="font-bold text-slate-900">= Net Sales Revenue</span>
                <span className="text-slate-400 block text-[11px]">Gross Sales less Returns</span>
              </div>
              <span className="font-extrabold text-slate-900 font-sora">
                {formatCurrency(pnl.net_sales_revenue, currency)}
              </span>
            </div>

            {/* 4. Less COGS */}
            <div className="py-2.5 flex items-center justify-between text-slate-700">
              <div>
                <span className="font-bold">3. Less: Cost of Goods Sold (COGS)</span>
                <span className="text-slate-400 block text-[11px]">Invoiced embedded unit cost basis</span>
              </div>
              <span className="font-extrabold font-sora">
                −{formatCurrency(pnl.cogs, currency)}
              </span>
            </div>

            {/* 5. Gross Profit */}
            <div className="py-2.5 flex items-center justify-between bg-slate-50/80 px-2 rounded-lg">
              <div>
                <span className="font-bold text-slate-900">= Weekly Gross Profit</span>
                <span className="text-slate-500 block text-[11px]">
                  Gross Margin: <strong className="text-slate-800">{pnl.gross_margin_pct.toFixed(2)}%</strong>
                </span>
              </div>
              <span
                className={`font-extrabold font-sora ${
                  pnl.gross_profit >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {formatCurrency(pnl.gross_profit, currency)}
              </span>
            </div>

            {/* 6. Less Operating Expenses */}
            <div className="py-2.5 flex items-center justify-between text-slate-700">
              <div>
                <span className="font-bold">4. Less: Operating Expenses (Opex)</span>
                <span className="text-slate-400 block text-[11px]">
                  Attributable weekly depot operational overhead
                </span>
              </div>
              <span className="font-extrabold font-sora">
                −{formatCurrency(pnl.total_operating_expenses, currency)}
              </span>
            </div>

            {/* 7. Net Operating Profit */}
            <div className="py-3 flex items-center justify-between bg-[#7c6fff]/10 px-3 rounded-xl">
              <div>
                <span className="font-extrabold text-slate-900 text-sm">= Net Operating Profit / (Loss)</span>
                <span className="text-slate-600 block text-[11px]">
                  Net Margin: <strong className="text-slate-900">{pnl.net_margin_pct.toFixed(2)}%</strong>
                </span>
              </div>
              <span
                className={`text-base font-extrabold font-sora ${
                  pnl.net_profit >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatCurrency(pnl.net_profit, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Supporting Breakdown Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setBreakdownTab("daily")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              breakdownTab === "daily"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Rows ({selectedWeek?.daily_breakdown.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setBreakdownTab("products")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              breakdownTab === "products"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Top Products ({selectedWeek?.top_products.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setBreakdownTab("customers")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              breakdownTab === "customers"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Top Customers ({selectedWeek?.top_customers.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setBreakdownTab("returns")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              breakdownTab === "returns"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns Log ({selectedWeek?.returns.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setBreakdownTab("expenses")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              breakdownTab === "expenses"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Expenses Breakdown</span>
          </button>

          <button
            type="button"
            onClick={() => setBreakdownTab("all_weeks")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              breakdownTab === "all_weeks"
                ? "bg-[#7c6fff] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>All Weeks Matrix</span>
          </button>
        </div>

        {/* Breakdown Content */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Tab 1: Daily Breakdown */}
          {breakdownTab === "daily" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sora border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Day</th>
                    <th className="py-3 px-3 text-right">Invoices</th>
                    <th className="py-3 px-3 text-right">Revenue</th>
                    <th className="py-3 px-3 text-right">COGS</th>
                    <th className="py-3 px-3 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-inter">
                  {selectedWeek?.daily_breakdown.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{d.date}</td>
                      <td className="py-2.5 px-3 text-slate-600">{d.day_name}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">{d.invoices_count}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(d.gross_revenue, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatCurrency(d.cogs, currency)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          d.gross_profit >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(d.gross_profit, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-800">
                        {d.margin_pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Top Products */}
          {breakdownTab === "products" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sora border-b border-slate-200">
                    <th className="py-3 px-4">Product SKU</th>
                    <th className="py-3 px-3 text-right">Cases Sold</th>
                    <th className="py-3 px-3 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">Share of Week Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-inter">
                  {selectedWeek?.top_products.map((p) => (
                    <tr key={p.product_raw} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{p.product_raw}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                        {formatNumber(p.cases_sold)} Ctn
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(p.revenue, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-[#7c6fff]">
                        {(p.pct_of_week_revenue * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Top Customers */}
          {breakdownTab === "customers" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sora border-b border-slate-200">
                    <th className="py-3 px-4">Customer Account</th>
                    <th className="py-3 px-3 text-right">Invoices</th>
                    <th className="py-3 px-3 text-right">Revenue</th>
                    <th className="py-3 px-3 text-right">Gross Profit</th>
                    <th className="py-3 px-3 text-right">Margin %</th>
                    <th className="py-3 px-4 text-right">Week Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-inter">
                  {selectedWeek?.top_customers.map((c) => (
                    <tr key={c.customer} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{c.customer}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{c.invoices_count}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(c.revenue, currency)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          c.gross_profit >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(c.gross_profit, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {c.margin_pct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-[#7c6fff]">
                        {(c.pct_of_week_revenue * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Returns */}
          {breakdownTab === "returns" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sora border-b border-slate-200">
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Item Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Return Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-inter">
                  {selectedWeek?.returns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No returns recorded in this weekly window.
                      </td>
                    </tr>
                  ) : (
                    selectedWeek?.returns.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{r.voucher_no}</td>
                        <td className="py-2.5 px-3 text-slate-700">{r.customer}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{r.item_name}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              r.item_type === "Empties"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-[#7c6fff]/10 text-[#7c6fff]"
                            }`}
                          >
                            {r.item_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                          {formatNumber(r.quantity)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                          {formatCurrency(r.return_value, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 5: Expenses */}
          {breakdownTab === "expenses" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sora border-b border-slate-200">
                    <th className="py-3 px-4">Expense Category</th>
                    <th className="py-3 px-4 text-right">Allocated Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-inter">
                  {selectedWeek?.expenses.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{e.category}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(e.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 6: All Weeks Matrix */}
          {breakdownTab === "all_weeks" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sora border-b border-slate-200">
                    <th className="py-3 px-4">Week Window</th>
                    <th className="py-3 px-3 text-right">Invoices</th>
                    <th className="py-3 px-3 text-right">Gross Sales</th>
                    <th className="py-3 px-3 text-right">Returns</th>
                    <th className="py-3 px-3 text-right">Net Sales</th>
                    <th className="py-3 px-3 text-right">COGS</th>
                    <th className="py-3 px-3 text-right">Gross Profit</th>
                    <th className="py-3 px-3 text-right">Margin %</th>
                    <th className="py-3 px-3 text-right">Opex</th>
                    <th className="py-3 px-4 text-right">Net Operating Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-inter">
                  {weeksList.map((w) => (
                    <tr
                      key={w.week_number}
                      onClick={() => {
                        setSelectedWeekIndex(w.week_number - 1);
                        setBreakdownTab("daily");
                      }}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">{w.week_label}</td>
                      <td className="py-3 px-3 text-right text-slate-600">{w.pnl.invoices_count}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(w.pnl.gross_sales_revenue, currency)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold">
                        −{formatCurrency(w.pnl.total_sales_returns, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(w.pnl.net_sales_revenue, currency)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {formatCurrency(w.pnl.cogs, currency)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          w.pnl.gross_profit >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(w.pnl.gross_profit, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800">
                        {w.pnl.gross_margin_pct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {formatCurrency(w.pnl.total_operating_expenses, currency)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-extrabold font-sora ${
                          w.pnl.net_profit >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {formatCurrency(w.pnl.net_profit, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
