"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ArrowDownRight,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { AnalyzeResponse, BelowFloorItem, VolumeTierItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface PricingAuditScreenProps {
  data: AnalyzeResponse;
}

export function PricingAuditScreen({ data }: PricingAuditScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const belowFloor = data.below_floor_pricing || [];
  const volumeTier = data.volume_tier_audit || [];

  const [tierFilter, setTierFilter] = useState<"all" | "underpriced" | "overpriced" | "correct">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(50);

  const totalLeak = data.meta?.total_recoverable_leakage ?? belowFloor.reduce((acc, item) => acc + (item.revenue_opportunity || 0), 0);
  const totalVolumeOrders = data.meta?.volume_tier_counts?.total ?? volumeTier.length;
  const underpricedCount = data.meta?.volume_tier_counts?.underpriced ?? volumeTier.filter((v) => v.audit_result === "underpriced").length;
  const overpricedCount = data.meta?.volume_tier_counts?.overpriced ?? volumeTier.filter((v) => v.audit_result === "overpriced").length;
  const correctCount = data.meta?.volume_tier_counts?.correct ?? volumeTier.filter((v) => v.audit_result === "correct").length;

  // Filter items based on tierFilter and searchQuery
  const filteredVolumeTier = useMemo(() => {
    return volumeTier.filter((item) => {
      // 1. Result filter
      if (tierFilter !== "all" && item.audit_result !== tierFilter) {
        return false;
      }
      // 2. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesProduct = (item.product_raw || "").toLowerCase().includes(q);
        const matchesCustomer = (item.customer || "").toLowerCase().includes(q);
        const matchesInvoice = String(item.invoice_no || "").toLowerCase().includes(q);
        if (!matchesProduct && !matchesCustomer && !matchesInvoice) {
          return false;
        }
      }
      return true;
    });
  }, [volumeTier, tierFilter, searchQuery]);

  // Pagination calculation
  const totalFiltered = filteredVolumeTier.length;
  const actualPageSize = pageSize === "all" ? Math.max(totalFiltered, 1) : pageSize;
  const totalPages = Math.ceil(totalFiltered / actualPageSize) || 1;

  // Reset to page 1 if filter changes and currentPage exceeds totalPages
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
      {/* 1. Below Floor Pricing Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Below-Floor Pricing</h2>
            <p className="text-xs text-slate-500">Products sold below official distributor floor rate</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Leakage</span>
            <span className="text-sm font-extrabold text-rose-700">{formatCurrency(totalLeak, currency)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
          {belowFloor.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No products sold below floor price.
            </div>
          ) : (
            belowFloor.map((item, idx) => (
              <div key={idx} className="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{item.product_raw}</h3>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatNumber(item.cases_sold)} cases sold
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-700">
                      +{formatCurrency(item.revenue_opportunity, currency)}
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

      {/* 2. Volume-Tier Compliance Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Volume-Tier Pricing Audit</h2>
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
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
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
    </div>
  );
}
