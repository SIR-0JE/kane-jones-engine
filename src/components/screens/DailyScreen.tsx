"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  TrendingUp,
  ArrowUpDown,
  Search,
  Receipt,
  Percent,
  CalendarDays,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { AnalyzeResponse, DailySummaryItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface DailyScreenProps {
  data: AnalyzeResponse;
}

type SortField = "date_only" | "revenue" | "gross_profit" | "margin_pct" | "invoices";
type SortOrder = "asc" | "desc";

export function DailyScreen({ data }: DailyScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const dailyList: DailySummaryItem[] = data.daily_summary || [];
  const totalPeriodRevenue = data.meta?.total_revenue || 1;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date_only");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Summary Metrics Computation
  const summaryMetrics = useMemo(() => {
    if (dailyList.length === 0) {
      return {
        totalDays: 0,
        peakDay: null,
        lowestMarginDay: null,
        avgDailyRevenue: 0,
      };
    }

    let peakDay: DailySummaryItem = dailyList[0];
    let lowestMarginDay: DailySummaryItem = dailyList[0];
    let totalRev = 0;

    dailyList.forEach((d) => {
      totalRev += d.revenue || 0;
      if (d.revenue > (peakDay?.revenue || 0)) {
        peakDay = d;
      }
      if (d.margin_pct < (lowestMarginDay?.margin_pct ?? 1)) {
        lowestMarginDay = d;
      }
    });

    return {
      totalDays: dailyList.length,
      peakDay,
      lowestMarginDay,
      avgDailyRevenue: totalRev / dailyList.length,
    };
  }, [dailyList]);

  // Filter & Sort
  const processedData = useMemo(() => {
    return dailyList
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (item.date_only || "").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "date_only") {
          valA = new Date(valA).getTime() || 0;
          valB = new Date(valB).getTime() || 0;
        } else {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        }

        if (sortOrder === "asc") {
          return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
      });
  }, [dailyList, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "date_only" ? "asc" : "desc");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Daily Sales Breakdown
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full calendar performance showing daily sales, profit, margins, and order volume.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg shrink-0 self-start sm:self-auto">
          {summaryMetrics.totalDays} Days Recorded
        </div>
      </div>

      {/* 2. Top Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Days */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Days Audited</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {summaryMetrics.totalDays} Days
          </div>
          <span className="text-xs text-slate-400 block mt-0.5">
            Complete period coverage
          </span>
        </div>

        {/* Avg Daily Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Avg Daily Revenue</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate">
            {formatCurrency(summaryMetrics.avgDailyRevenue, currency)}
          </div>
          <span className="text-xs text-emerald-700 font-semibold block mt-0.5">
            Daily run-rate
          </span>
        </div>

        {/* Peak Revenue Day */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 block">Peak Revenue Day</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-800 mt-1 truncate">
            {summaryMetrics.peakDay ? formatCurrency(summaryMetrics.peakDay.revenue, currency) : "N/A"}
          </div>
          <span className="text-xs text-emerald-700 font-medium block mt-0.5 truncate">
            {summaryMetrics.peakDay ? formatDate(summaryMetrics.peakDay.date_only) : "—"}
          </span>
        </div>

        {/* Lowest Margin Day */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 block">Lowest Margin Day</span>
          <div className="text-lg sm:text-xl font-bold text-rose-800 mt-1">
            {summaryMetrics.lowestMarginDay ? formatPercent(summaryMetrics.lowestMarginDay.margin_pct) : "N/A"}
          </div>
          <span className="text-xs text-rose-700 font-medium block mt-0.5 truncate">
            {summaryMetrics.lowestMarginDay ? formatDate(summaryMetrics.lowestMarginDay.date_only) : "—"}
          </span>
        </div>
      </div>

      {/* 3. Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by date (YYYY-MM-DD)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Sort:</span>
          <button
            onClick={() => handleSort("date_only")}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              sortField === "date_only"
                ? "bg-slate-900 text-white border-slate-900 font-semibold"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Date {sortField === "date_only" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("revenue")}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              sortField === "revenue"
                ? "bg-slate-900 text-white border-slate-900 font-semibold"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Revenue {sortField === "revenue" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("margin_pct")}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              sortField === "margin_pct"
                ? "bg-slate-900 text-white border-slate-900 font-semibold"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Margin {sortField === "margin_pct" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        </div>
      </div>

      {/* 4. Daily Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold select-none">
                <th
                  onClick={() => handleSort("date_only")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("invoices")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Invoices</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("revenue")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Gross Revenue</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("gross_profit")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Gross Profit</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("margin_pct")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No daily records found matching query.
                  </td>
                </tr>
              ) : (
                processedData.map((day, idx) => {
                  const shareOfPeriod = (day.revenue / totalPeriodRevenue) * 100;
                  const isLoss = day.gross_profit < 0;
                  const aov = day.invoices > 0 ? day.revenue / day.invoices : 0;

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                          <span>{formatDate(day.date_only)}</span>
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                            ({day.date_only})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-[11px]">
                          {formatNumber(day.invoices)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        <div>{formatCurrency(day.revenue, currency)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {shareOfPeriod.toFixed(1)}% of month
                        </div>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          isLoss ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(day.gross_profit, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            isLoss
                              ? "bg-rose-100 text-rose-800"
                              : day.margin_pct < 0.015
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                          }`}
                        >
                          {formatPercent(day.margin_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 font-medium font-mono text-[11px]">
                        {formatCurrency(aov, currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-slate-500 text-xs flex items-center justify-between">
          <span>Showing {processedData.length} of {dailyList.length} days</span>
          <span className="font-semibold text-slate-700">
            Total Revenue: {formatCurrency(data.meta?.total_revenue, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
