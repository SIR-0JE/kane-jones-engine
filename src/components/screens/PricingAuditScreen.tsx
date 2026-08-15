"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowDownRight,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Tag,
  DollarSign,
  Package,
  Layers,
  Scale
} from "lucide-react";
import { AnalyzeResponse, BelowFloorItem, VolumeTierItem, TrueCostProductItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface PricingAuditScreenProps {
  data: AnalyzeResponse;
}

export function PricingAuditScreen({ data }: PricingAuditScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const belowFloor = data.below_floor_pricing || [];
  const volumeTier = data.volume_tier_audit || [];
  const trueCostProducts: TrueCostProductItem[] = data.true_cost_products || [];

  // Active sub-tab in Pricing Audit Screen
  const [activeSection, setActiveSection] = useState<"below_floor" | "volume_tier" | "unit_cost_vs_selling">("below_floor");

  // Volume tier filters & search
  const [tierFilter, setTierFilter] = useState<"all" | "underpriced" | "overpriced" | "correct">("all");
  const [volumeSearchQuery, setVolumeSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(50);

  // Unit Cost vs Selling Price filters & search
  const [costSpreadFilter, setCostSpreadFilter] = useState<"all" | "profitable" | "razor_thin" | "loss_making">("all");
  const [costSearchQuery, setCostSearchQuery] = useState("");

  const totalLeak = data.meta?.total_recoverable_leakage ?? belowFloor.reduce((acc, item) => acc + (item.revenue_opportunity || 0), 0);
  const totalVolumeOrders = data.meta?.volume_tier_counts?.total ?? volumeTier.length;
  const underpricedCount = data.meta?.volume_tier_counts?.underpriced ?? volumeTier.filter((v) => v.audit_result === "underpriced").length;
  const overpricedCount = data.meta?.volume_tier_counts?.overpriced ?? volumeTier.filter((v) => v.audit_result === "overpriced").length;
  const correctCount = data.meta?.volume_tier_counts?.correct ?? volumeTier.filter((v) => v.audit_result === "correct").length;

  // Filter items for Volume Tier
  const filteredVolumeTier = useMemo(() => {
    return volumeTier.filter((item) => {
      if (tierFilter !== "all" && item.audit_result !== tierFilter) {
        return false;
      }
      if (volumeSearchQuery.trim()) {
        const q = volumeSearchQuery.toLowerCase();
        const matchesProduct = (item.product_raw || "").toLowerCase().includes(q);
        const matchesCustomer = (item.customer || "").toLowerCase().includes(q);
        const matchesInvoice = String(item.invoice_no || "").toLowerCase().includes(q);
        if (!matchesProduct && !matchesCustomer && !matchesInvoice) {
          return false;
        }
      }
      return true;
    });
  }, [volumeTier, tierFilter, volumeSearchQuery]);

  // Filter items for Unit Cost vs Selling Price
  const filteredTrueCostProducts = useMemo(() => {
    return trueCostProducts.filter((item) => {
      const marginPct = item.gross_profit_pct ?? (item.revenue > 0 ? item.gross_profit / item.revenue : 0);
      const isLoss = item.price_diff < 0 || item.gross_profit < 0;
      const isRazorThin = !isLoss && marginPct < 0.02; // Under 2%
      const isProfitable = !isLoss && marginPct >= 0.02;

      if (costSpreadFilter === "loss_making" && !isLoss) return false;
      if (costSpreadFilter === "razor_thin" && !isRazorThin) return false;
      if (costSpreadFilter === "profitable" && !isProfitable) return false;

      if (costSearchQuery.trim()) {
        const q = costSearchQuery.toLowerCase();
        if (!item.product_raw.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [trueCostProducts, costSpreadFilter, costSearchQuery]);

  // Summary figures for Unit Cost vs Selling Price
  const totalCostProductsRevenue = trueCostProducts.reduce((acc, p) => acc + (p.revenue || 0), 0);
  const totalCostProductsCogs = trueCostProducts.reduce((acc, p) => acc + (p.total_cost || 0), 0);
  const totalCostProductsProfit = trueCostProducts.reduce((acc, p) => acc + (p.gross_profit || 0), 0);
  const lossMakingProductsCount = trueCostProducts.filter((p) => p.price_diff < 0 || p.gross_profit < 0).length;

  // Pagination calculation for Volume Tier
  const totalFiltered = filteredVolumeTier.length;
  const actualPageSize = pageSize === "all" ? Math.max(totalFiltered, 1) : pageSize;
  const totalPages = Math.ceil(totalFiltered / actualPageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIdx = (validCurrentPage - 1) * actualPageSize;
  const endIdx = pageSize === "all" ? totalFiltered : Math.min(startIdx + actualPageSize, totalFiltered);
  const paginatedOrders = filteredVolumeTier.slice(startIdx, endIdx);

  const handleFilterChange = (filter: "all" | "underpriced" | "overpriced" | "correct") => {
    setTierFilter(filter);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* Header & Sub-Tab Navigation */}
      <div className="space-y-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 font-sora">
              Pricing Audit & Leaks Diagnostic
            </h1>
            <p className="text-xs text-slate-500 font-inter">
              Detailed audit of below-floor price gaps, volume tier policy compliance, and unit cost vs selling spreads
            </p>
          </div>
        </div>

        {/* 3 Main Sub-Tabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection("below_floor")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs font-sora transition-all shrink-0 ${
              activeSection === "below_floor"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Below-Floor Pricing</span>
            {belowFloor.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-md">
                {belowFloor.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("volume_tier")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs font-sora transition-all shrink-0 ${
              activeSection === "volume_tier"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Volume-Tier Audit</span>
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md">
              {totalVolumeOrders}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("unit_cost_vs_selling")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs font-sora transition-all shrink-0 ${
              activeSection === "unit_cost_vs_selling"
                ? "bg-white text-[#7c6fff] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Unit Cost vs Selling Price</span>
            {lossMakingProductsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] font-extrabold rounded-md">
                {lossMakingProductsCount} loss
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: Below-Floor Pricing */}
      {activeSection === "below_floor" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sora">Below-Floor Rate Diagnostic</h2>
              <p className="text-xs text-slate-500">Products invoiced below the minimum distributor floor rate</p>
            </div>
            <div className="text-right bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
              <span className="text-[10px] uppercase font-bold text-rose-700 block font-sora">Recoverable Leakage</span>
              <span className="text-sm font-extrabold text-rose-700 font-sora">{formatCurrency(totalLeak, currency, true)}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
            {belowFloor.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-inter">
                No products sold below floor price. All SKU rates comply with minimum distributor floor policies.
              </div>
            ) : (
              belowFloor.map((item, idx) => (
                <div key={idx} className="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 font-sora">{item.product_raw}</h3>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatNumber(item.cases_sold)} cases sold
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-700 font-sora">
                        +{formatCurrency(item.revenue_opportunity, currency, true)}
                      </span>
                      <span className="block text-[10px] text-rose-600 font-semibold">
                        Gap: {formatPercent(item.gap_pct)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Avg Rate Charged</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(item.avg_rate_charged, currency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Distributor Floor</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(item.distributor_price, currency)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: Volume-Tier Compliance */}
      {activeSection === "volume_tier" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sora">Volume-Tier Pricing Audit</h2>
              <p className="text-xs text-slate-500">Order size vs price tier policy (Distributor: ≥300, Sub-distributor: 50–299, Retail: 0–49)</p>
            </div>
            <div className="text-xs text-slate-500 font-medium self-start sm:self-auto">
              {totalVolumeOrders} total orders audited
            </div>
          </div>

          {/* Filter chips & Search Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            {/* Result Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                onClick={() => handleFilterChange("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  tierFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({totalVolumeOrders})
              </button>
              <button
                onClick={() => handleFilterChange("underpriced")}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  tierFilter === "underpriced"
                    ? "bg-rose-700 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                Underpriced ({underpricedCount})
              </button>
              <button
                onClick={() => handleFilterChange("overpriced")}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  tierFilter === "overpriced"
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Overpriced ({overpricedCount})
              </button>
              <button
                onClick={() => handleFilterChange("correct")}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  tierFilter === "correct"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Correct ({correctCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product, customer, inv #..."
                value={volumeSearchQuery}
                onChange={(e) => {
                  setVolumeSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Volume Tier Items List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {paginatedOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No orders match the selected filters or search query.
                </div>
              ) : (
                paginatedOrders.map((item, idx) => (
                  <div key={idx} className="p-3.5 text-xs space-y-2 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.product_raw}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-medium">
                            Inv #{item.invoice_no}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Customer: <strong className="text-slate-700">{item.customer}</strong>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          item.audit_result === "underpriced"
                            ? "bg-rose-100 text-rose-800"
                            : item.audit_result === "overpriced"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.audit_result}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100 gap-2">
                      <div>
                        Qty: <strong className="text-slate-900">{item.quantity} cases</strong> (Tier: <span className="font-semibold text-slate-700 capitalize">{item.expected_tier}</span>)
                      </div>
                      <div className="flex items-center gap-2">
                        <span>
                          Charged: <strong className="text-slate-900">{formatCurrency(item.rate, currency)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Policy Price: <strong className="text-slate-900">{formatCurrency(item.expected_price, currency)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls Bar */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 select-none">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-slate-900">{totalFiltered > 0 ? startIdx + 1 : 0}–{endIdx}</strong> of{" "}
                  <strong className="text-slate-900">{totalFiltered}</strong> orders
                </span>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const val = e.target.value === "all" ? "all" : Number(e.target.value);
                      setPageSize(val);
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All ({totalFiltered})</option>
                  </select>
                </div>
              </div>

              {pageSize !== "all" && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={validCurrentPage === 1}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                    title="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={validCurrentPage === 1}
                    className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <span className="px-2 font-semibold text-slate-800">
                    Page {validCurrentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={validCurrentPage === totalPages}
                    className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validCurrentPage === totalPages}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                    title="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Unit Cost vs Selling Price Breakdown */}
      {activeSection === "unit_cost_vs_selling" && (
        <div className="space-y-4">
          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sora block">Products Audited</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-sora">
                {trueCostProducts.length} SKUs
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Inventory master matched</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sora block">Gross Revenue</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-sora">
                {formatCurrency(totalCostProductsRevenue, currency, true)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Realized sales value</span>
            </div>

            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase font-sora block">Total Product Cost</span>
              <div className="text-xl font-extrabold text-rose-700 mt-1 font-sora">
                −{formatCurrency(totalCostProductsCogs, currency, true)}
              </div>
              <span className="text-[11px] text-rose-600 font-medium block mt-0.5">Purchase cost (COGS)</span>
            </div>

            <div className={`p-4 rounded-xl border shadow-xs ${totalCostProductsProfit >= 0 ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"}`}>
              <span className={`text-[10px] font-bold uppercase font-sora block ${totalCostProductsProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                Gross Trading Spread
              </span>
              <div className={`text-xl font-extrabold mt-1 font-sora ${totalCostProductsProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {totalCostProductsProfit >= 0 ? "+" : ""}{formatCurrency(totalCostProductsProfit, currency, true)}
              </div>
              <span className={`text-[11px] font-medium block mt-0.5 ${totalCostProductsProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {totalCostProductsRevenue > 0 ? formatPercent(totalCostProductsProfit / totalCostProductsRevenue) : "0%"} overall margin
              </span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                onClick={() => setCostSpreadFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  costSpreadFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Products ({trueCostProducts.length})
              </button>
              <button
                onClick={() => setCostSpreadFilter("loss_making")}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  costSpreadFilter === "loss_making"
                    ? "bg-rose-700 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                Loss-Making ({lossMakingProductsCount})
              </button>
              <button
                onClick={() => setCostSpreadFilter("razor_thin")}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  costSpreadFilter === "razor_thin"
                    ? "bg-amber-700 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Razor-Thin (&lt;2%)
              </button>
              <button
                onClick={() => setCostSpreadFilter("profitable")}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  costSpreadFilter === "profitable"
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Profitable (&ge;2%)
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product SKU..."
                value={costSearchQuery}
                onChange={(e) => setCostSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Unit Cost vs Selling Price Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold font-sora">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3 text-right">Unit Cost Price</th>
                    <th className="py-3 px-3 text-right">Unit Selling Price</th>
                    <th className="py-3 px-3 text-right">Unit Margin Spread</th>
                    <th className="py-3 px-3 text-right">Margin %</th>
                    <th className="py-3 px-3 text-right">Cases Sold</th>
                    <th className="py-3 px-3 text-right">Total Revenue</th>
                    <th className="py-3 px-3 text-right">Total Profit / (Loss)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-inter">
                  {filteredTrueCostProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No products match the selected filters or search query.
                      </td>
                    </tr>
                  ) : (
                    filteredTrueCostProducts.map((item, idx) => {
                      const isNegative = item.price_diff < 0 || item.gross_profit < 0;
                      const marginPct = item.gross_profit_pct ?? (item.revenue > 0 ? item.gross_profit / item.revenue : 0);
                      const isRazor = !isNegative && marginPct < 0.02;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isNegative ? "bg-rose-50/30" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.product_raw}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-rose-700">
                            {formatCurrency(item.tmp3f5d_cost, currency, false)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(item.avg_selling_price, currency, false)}
                          </td>
                          <td className={`py-3 px-3 text-right font-bold font-sora ${
                            isNegative ? "text-rose-700" : "text-emerald-700"
                          }`}>
                            {item.price_diff >= 0 ? "+" : ""}{formatCurrency(item.price_diff, currency, false)}
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${
                            isNegative ? "text-rose-700" : isRazor ? "text-amber-700" : "text-emerald-700"
                          }`}>
                            {formatPercent(marginPct)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            {formatNumber(item.cases_sold)}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-900">
                            {formatCurrency(item.revenue, currency, true)}
                          </td>
                          <td className={`py-3 px-3 text-right font-extrabold font-sora ${
                            isNegative ? "text-rose-700" : "text-emerald-700"
                          }`}>
                            {item.gross_profit >= 0 ? "+" : ""}{formatCurrency(item.gross_profit, currency, true)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isNegative
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : isRazor
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              {isNegative ? "Loss (<0%)" : isRazor ? "Razor (<2%)" : "Profitable"}
                            </span>
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
      )}
    </div>
  );
}
