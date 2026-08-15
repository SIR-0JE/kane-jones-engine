"use client";

import React, { useMemo } from "react";
import {
  CalendarRange,
  TrendingUp,
  BarChart3,
  Receipt,
  Layers,
  Percent,
  Calendar
} from "lucide-react";
import { AnalyzeResponse, WeeklySummaryItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface WeeklyScreenProps {
  data: AnalyzeResponse;
}

export function WeeklyScreen({ data }: WeeklyScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const weeklyList: WeeklySummaryItem[] = data.weekly_summary || [];
  const totalPeriodRevenue = data.meta?.total_revenue || 1;

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (weeklyList.length === 0) {
      return {
        totalWeeks: 0,
        peakWeek: null,
        bestMarginWeek: null,
        avgWeeklyRevenue: 0,
      };
    }

    let peakWeek: WeeklySummaryItem = weeklyList[0];
    let bestMarginWeek: WeeklySummaryItem = weeklyList[0];
    let totalRev = 0;

    weeklyList.forEach((w) => {
      totalRev += w.revenue || 0;
      if (w.revenue > (peakWeek?.revenue || 0)) {
        peakWeek = w;
      }
      if (w.margin_pct > (bestMarginWeek?.margin_pct || 0)) {
        bestMarginWeek = w;
      }
    });

    return {
      totalWeeks: weeklyList.length,
      peakWeek,
      bestMarginWeek,
      avgWeeklyRevenue: totalRev / weeklyList.length,
    };
  }, [weeklyList]);

  const getWeekDayRange = (weekNum: number) => {
    switch (weekNum) {
      case 1:
        return "Days 1 – 7";
      case 2:
        return "Days 8 – 14";
      case 3:
        return "Days 15 – 21";
      case 4:
        return "Days 22 – 28";
      case 5:
        return "Days 29 – 31";
      default:
        return `Week ${weekNum}`;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Weekly Performance Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated 7-day performance blocks showing volume progression and margin health.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg shrink-0 self-start sm:self-auto">
          {summaryMetrics.totalWeeks} Weeks Audited
        </div>
      </div>

      {/* 2. Top Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Weeks */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Period Weeks</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {summaryMetrics.totalWeeks} Weeks
          </div>
          <span className="text-xs text-slate-400 block mt-0.5">
            Grouped by 7-day blocks
          </span>
        </div>

        {/* Avg Weekly Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Avg Weekly Revenue</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate">
            {formatCurrency(summaryMetrics.avgWeeklyRevenue, currency, true)}
          </div>
          <span className="text-xs text-emerald-700 font-semibold block mt-0.5">
            Weekly run-rate
          </span>
        </div>

        {/* Peak Revenue Week */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 block">Peak Revenue Week</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-800 mt-1 truncate">
            {summaryMetrics.peakWeek ? formatCurrency(summaryMetrics.peakWeek.revenue, currency, true) : "N/A"}
          </div>
          <span className="text-xs text-emerald-700 font-medium block mt-0.5 truncate">
            {summaryMetrics.peakWeek ? `Week ${summaryMetrics.peakWeek.week} (${getWeekDayRange(summaryMetrics.peakWeek.week)})` : "—"}
          </span>
        </div>

        {/* Best Margin Week */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Best Margin Week</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {summaryMetrics.bestMarginWeek ? formatPercent(summaryMetrics.bestMarginWeek.margin_pct) : "N/A"}
          </div>
          <span className="text-xs text-slate-400 block mt-0.5">
            {summaryMetrics.bestMarginWeek ? `Week ${summaryMetrics.bestMarginWeek.week}` : "—"}
          </span>
        </div>
      </div>

      {/* 3. Weekly Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {weeklyList.map((week, idx) => {
          const share = (week.revenue / totalPeriodRevenue) * 100;
          const isLoss = week.gross_profit < 0;

          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-slate-100 rounded-md text-slate-700">
                      <CalendarRange className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      Week {week.week}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {getWeekDayRange(week.week)}
                  </span>
                </div>

                <div className="space-y-2.5 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Gross Revenue
                    </span>
                    <div className="text-base font-extrabold text-slate-900 tracking-tight">
                      {formatCurrency(week.revenue, currency)}
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-slate-900 h-full rounded-full"
                        style={{ width: `${Math.min(share * 2.5, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                      {share.toFixed(1)}% of period total
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Gross Profit</span>
                      <span
                        className={`text-xs font-bold ${
                          isLoss ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(week.gross_profit, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Margin</span>
                      <span className="text-xs font-bold text-slate-800">
                        {formatPercent(week.margin_pct)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Invoices:</span>
                <span className="font-semibold text-slate-800">
                  {formatNumber(week.invoices)} orders
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Full Table View */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Weekly Tabular Breakdown
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {weeklyList.length} Period Weeks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Week Block</th>
                <th className="py-3 px-4">Date Range</th>
                <th className="py-3 px-4 text-center">Invoices</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-4 text-right">Avg Daily Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weeklyList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No weekly summary data available.
                  </td>
                </tr>
              ) : (
                weeklyList.map((week, idx) => {
                  const share = (week.revenue / totalPeriodRevenue) * 100;
                  const isLoss = week.gross_profit < 0;
                  const daysInWeek = week.week === 5 ? 3 : 7;
                  const dailyAvg = week.revenue / daysInWeek;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        Week {week.week}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {getWeekDayRange(week.week)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-[11px] text-slate-700">
                          {formatNumber(week.invoices)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        <div>{formatCurrency(week.revenue, currency)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {share.toFixed(1)}% of month
                        </div>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          isLoss ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(week.gross_profit, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            isLoss
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                          }`}
                        >
                          {formatPercent(week.margin_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 font-medium text-[11px]">
                        {formatCurrency(dailyAvg, currency)}/day
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
