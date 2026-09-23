"use client";

import React, { useState, useMemo } from "react";
import {
  Boxes,
  AlertTriangle,
  Flame,
  TrendingDown,
  ShieldCheck,
  RotateCcw,
  Zap,
  Sliders,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Coins,
  Package,
  Info,
} from "lucide-react";
import { AnalyzeResponse, ProductStockHealth, StockHealthData } from "@/types/api";
import { formatCurrency, formatNumber } from "@/lib/api";

interface StockHealthScreenProps {
  data: AnalyzeResponse;
}

type TabMode = "stockout" | "capital" | "reorders" | "all";

export function StockHealthScreen({ data }: StockHealthScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const stockHealth: StockHealthData | undefined = data.stock_health;

  // Peak Period Simulation state (per section 1.6 of spec)
  const [isPeakActive, setIsPeakActive] = useState<boolean>(false);
  const [peakMultiplier, setPeakMultiplier] = useState<number>(1.5);

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabMode>("stockout");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("velocity");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Fallback if no inventory summary sheet was parsed
  if (!stockHealth || !stockHealth.all_products || stockHealth.all_products.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto my-12 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
        <Boxes className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 font-sora">
          Inventory Summary Sheet Required
        </h2>
        <p className="text-xs text-slate-600 font-inter max-w-md mx-auto">
          Stock Health Analysis requires an uploaded Inventory Summary extract (specifying product, stock units, and rate per unit). Upload a workbook containing stock data to enable inventory velocity and reorder alerts.
        </p>
      </div>
    );
  }

  const { summary, summary_bands, all_products } = stockHealth;

  // Dynamic products with simulated peak multipliers if active
  const dynamicProducts: ProductStockHealth[] = useMemo(() => {
    return all_products.map((p) => {
      if (!isPeakActive) return p;

      const p_v = p.daily_velocity * peakMultiplier;
      const p_safety = p_v * p.lead_time_days;
      const p_rop = p_safety * 2.0;
      const p_sugg = Math.max(0, p_rop - p.current_stock);
      const p_cover_days = p_v > 0 ? p.current_stock / p_v : null;
      const p_cover_weeks = p_cover_days !== null ? p_cover_days / 7.0 : null;

      return {
        ...p,
        peak_adjusted: {
          multiplier: peakMultiplier,
          is_active: true,
          peak_daily_velocity: Math.round(p_v * 100) / 100,
          peak_safety_stock: Math.round(p_safety * 100) / 100,
          peak_reorder_point: Math.round(p_rop * 100) / 100,
          peak_suggested_reorder_qty: Math.round(p_sugg * 100) / 100,
          peak_estimated_reorder_cost: Math.round(p_sugg * p.unit_cost * 100) / 100,
          peak_stock_cover_weeks: p_cover_weeks !== null ? Math.round(p_cover_weeks * 100) / 100 : null,
        },
      };
    });
  }, [all_products, isPeakActive, peakMultiplier]);

  // Filtered views based on active tab
  const displayedProducts = useMemo(() => {
    let list = [...dynamicProducts];

    if (activeTab === "stockout") {
      list = list
        .filter((p) => p.status === "Critical (stock-out risk)")
        .sort((a, b) => {
          const vA = isPeakActive ? a.peak_adjusted.peak_daily_velocity : a.daily_velocity;
          const vB = isPeakActive ? b.peak_adjusted.peak_daily_velocity : b.daily_velocity;
          return vB - vA;
        });
    } else if (activeTab === "capital") {
      list = list
        .filter((p) => p.status === "Dead Stock" || p.status === "Excess (capital tied up)" || p.status === "High / Monitor")
        .sort((a, b) => b.capital_tied_up - a.capital_tied_up);
    } else if (activeTab === "reorders") {
      list = list
        .filter((p) => {
          const sugg = isPeakActive ? p.peak_adjusted.peak_suggested_reorder_qty : p.suggested_reorder_qty;
          return sugg > 0;
        })
        .sort((a, b) => {
          const sA = isPeakActive ? a.peak_adjusted.peak_suggested_reorder_qty : a.suggested_reorder_qty;
          const sB = isPeakActive ? b.peak_adjusted.peak_suggested_reorder_qty : b.suggested_reorder_qty;
          return sB - sA;
        });
    } else {
      // 'all' tab with filters and search
      if (statusFilter !== "ALL") {
        list = list.filter((p) => p.status === statusFilter);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter((p) => p.product_name.toLowerCase().includes(q));
      }
      list.sort((a, b) => {
        let diff = 0;
        if (sortField === "stock") diff = a.current_stock - b.current_stock;
        else if (sortField === "capital") diff = a.capital_tied_up - b.capital_tied_up;
        else if (sortField === "velocity") diff = a.daily_velocity - b.daily_velocity;
        else if (sortField === "cover") diff = (a.stock_cover_weeks || 999) - (b.stock_cover_weeks || 999);
        else diff = a.status_order - b.status_order;
        return sortAsc ? diff : -diff;
      });
    }

    return list;
  }, [dynamicProducts, activeTab, isPeakActive, statusFilter, searchQuery, sortField, sortAsc]);

  // Color helper for badges
  const getBadgeClass = (status: string) => {
    switch (status) {
      case "Critical (stock-out risk)":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Low":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Healthy":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "High / Monitor":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Excess (capital tied up)":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Dead Stock":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header Section & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sora">
              Stock & Inventory Health Analysis
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#7c6fff]/10 text-[#7c6fff]">
              Phase 1 & 2 Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-inter">
            Trailing 30/45-day sales velocity, safety stock buffers, capital stagnation, and predictive replenishment.
          </p>
        </div>

        {/* Lead time indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Supplier Lead Time: 10 Days</span>
        </div>
      </div>

      {/* 2. Peak-Period Seasonal Simulator Banner (Section 1.6) */}
      <div className="p-4 bg-linear-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 font-sora">
                Peak-Period Seasonal Simulator
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Guesstimate Mode (e.g. December Rush)
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-inter">
              Apply a seasonal multiplier over historical velocity to stress-test stock-out risks and side-by-side reorder requirements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsPeakActive(!isPeakActive)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
              isPeakActive
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isPeakActive ? "fill-white" : ""}`} />
            <span>{isPeakActive ? "Simulation Active" : "Simulate Peak"}</span>
          </button>

          {isPeakActive && (
            <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-xl p-1 shadow-xs">
              {[1.25, 1.5, 1.75, 2.0].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPeakMultiplier(m)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors ${
                    peakMultiplier === m
                      ? "bg-amber-500 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  ×{m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Stock Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Stock On Hand</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-sora">
            {formatCurrency(summary.total_stock_value, currency)}
          </div>
          <span className="text-[11px] text-slate-400 block font-inter">
            {summary.total_active_skus} Active Product SKUs
          </span>
        </div>

        {/* Stock-Out Risk */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-xs space-y-1 bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Stock-Out Risk (&lt;1 Wk)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-rose-600 font-sora">
            {summary.critical_stock_out_count} SKUs Critical
          </div>
          <span className="text-[11px] text-rose-500 block font-inter">
            Immediate replenishment required
          </span>
        </div>

        {/* Capital Tied Up in Slow / Dead */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200/90 shadow-xs space-y-1 bg-purple-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">Trapped Stagnant Capital</span>
            <Coins className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-purple-700 font-sora">
            {formatCurrency(summary.slow_moving_capital + summary.dead_stock_capital, currency)}
          </div>
          <span className="text-[11px] text-purple-600 block font-inter">
            {summary.dead_stock_count} Dead SKUs + Excess stock
          </span>
        </div>

        {/* Suggested Reorder Units */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Reorders to Reach ROP</span>
            <RotateCcw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-sora">
            {formatNumber(summary.suggested_reorder_units)} Units
          </div>
          <span className="text-[11px] text-slate-500 block font-inter">
            Estimated Cost: {formatCurrency(summary.suggested_reorder_cost, currency)}
          </span>
        </div>
      </div>

      {/* 4. 6-Band Health Distribution Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sora">
            Stock Cover Health Distribution
          </h2>
          <span className="text-xs text-slate-400 font-inter">
            As of {stockHealth.as_of_date}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {Object.values(summary_bands).map((b) => (
            <div
              key={b.status}
              onClick={() => {
                setActiveTab("all");
                setStatusFilter(b.status);
              }}
              className="p-3 rounded-xl border border-slate-200/80 hover:border-[#7c6fff] cursor-pointer transition-all hover:shadow-xs bg-slate-50/50"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>{b.badge}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white text-slate-800 text-[10px] font-extrabold shadow-2xs">
                  {b.sku_count}
                </span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 font-sora">
                {formatCurrency(b.total_capital_tied_up, currency)}
              </div>
              <span className="text-[10px] text-slate-400 block font-inter mt-0.5">
                {formatNumber(b.total_units)} Units
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Interactive Tab Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("stockout")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "stockout"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Top Stock-Out Risk ({summary.critical_stock_out_count})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("capital")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "capital"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Trapped Working Capital</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reorders")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "reorders"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Suggested Reorders ({summary.suggested_reorder_skus_count})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>All Products ({all_products.length})</span>
          </button>
        </div>

        {/* Search & Status Filter for 'all' tab */}
        {activeTab === "all" && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU..."
                className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#7c6fff]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#7c6fff]"
            >
              <option value="ALL">All Bands</option>
              <option value="Critical (stock-out risk)">Critical</option>
              <option value="Low">Low</option>
              <option value="Healthy">Healthy</option>
              <option value="High / Monitor">High / Monitor</option>
              <option value="Excess (capital tied up)">Excess</option>
              <option value="Dead Stock">Dead Stock</option>
            </select>
          </div>
        )}
      </div>

      {/* 6. Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sora">
                <th className="py-3 px-4">Product SKU</th>
                <th className="py-3 px-3 text-right">Stock (On Hand)</th>
                <th className="py-3 px-3 text-right">Daily Velocity</th>
                {isPeakActive && (
                  <th className="py-3 px-3 text-right text-amber-700 bg-amber-50/50">
                    Peak Velocity (×{peakMultiplier})
                  </th>
                )}
                <th className="py-3 px-3 text-right">Stock Cover</th>
                {isPeakActive && (
                  <th className="py-3 px-3 text-right text-amber-700 bg-amber-50/50">
                    Peak Cover
                  </th>
                )}
                <th className="py-3 px-3 text-right">Safety / ROP</th>
                <th className="py-3 px-3 text-right">Suggested Reorder</th>
                <th className="py-3 px-3 text-right">Capital Tied Up</th>
                <th className="py-3 px-4">Action Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-inter">
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No products match the selected view or filter criteria.
                  </td>
                </tr>
              ) : (
                displayedProducts.map((p) => {
                  const isCritical = p.status === "Critical (stock-out risk)";
                  const isDead = p.status === "Dead Stock";
                  const isExcess = p.status === "Excess (capital tied up)";

                  const coverText =
                    p.stock_cover_weeks !== null
                      ? `${p.stock_cover_weeks.toFixed(1)} wks (${Math.round(p.stock_cover_days || 0)}d)`
                      : isDead
                      ? "No Sales (0d)"
                      : "—";

                  const peakCoverText =
                    p.peak_adjusted?.peak_stock_cover_weeks !== null
                      ? `${p.peak_adjusted.peak_stock_cover_weeks?.toFixed(1)} wks`
                      : "—";

                  const suggQty = isPeakActive
                    ? p.peak_adjusted.peak_suggested_reorder_qty
                    : p.suggested_reorder_qty;

                  return (
                    <tr
                      key={p.product_key}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCritical ? "bg-rose-50/20" : isDead ? "bg-slate-50/40" : ""
                      }`}
                    >
                      {/* Product Name & Status Badge */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.product_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(
                              p.status
                            )}`}
                          >
                            {p.status}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.window_type.includes("45") ? "45d window (<10 txns)" : "30d window"}
                          </span>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatNumber(p.current_stock)} {p.uom}
                      </td>

                      {/* Daily Velocity */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-semibold text-slate-800">
                          {p.daily_velocity.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">units/day</span>
                      </td>

                      {/* Peak Velocity */}
                      {isPeakActive && (
                        <td className="py-3 px-3 text-right bg-amber-50/30 text-amber-900 font-bold">
                          {p.peak_adjusted.peak_daily_velocity.toFixed(2)}
                          <span className="text-[10px] text-amber-600 block">units/day</span>
                        </td>
                      )}

                      {/* Stock Cover */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-700">
                        {coverText}
                      </td>

                      {/* Peak Cover */}
                      {isPeakActive && (
                        <td className="py-3 px-3 text-right bg-amber-50/30 font-bold text-amber-900">
                          {peakCoverText}
                        </td>
                      )}

                      {/* Safety / ROP */}
                      <td className="py-3 px-3 text-right text-slate-600">
                        <span className="font-semibold">{Math.round(p.safety_stock)}</span> /{" "}
                        <span className="font-bold text-slate-900">{Math.round(p.reorder_point)}</span>
                      </td>

                      {/* Suggested Reorder */}
                      <td className="py-3 px-3 text-right">
                        {suggQty > 0 ? (
                          <div>
                            <span className="font-extrabold text-rose-600">
                              +{formatNumber(suggQty)} {p.uom}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {formatCurrency(suggQty * p.unit_cost, currency)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Capital Tied Up */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(p.capital_tied_up, currency)}
                      </td>

                      {/* Action Recommendation */}
                      <td className="py-3 px-4 text-slate-700 text-xs">
                        <div className="line-clamp-2 max-w-xs">{p.action_recommendation}</div>
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
