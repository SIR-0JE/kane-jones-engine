"use client";

import React, { useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, TrendingDown, ArrowDownRight } from "lucide-react";
import { AnalyzeResponse, BelowFloorItem, VolumeTierItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface PricingAuditScreenProps {
  data: AnalyzeResponse;
}

export function PricingAuditScreen({ data }: PricingAuditScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const belowFloor = data.below_floor_pricing || [];
  const volumeTier = data.volume_tier_audit || [];

  const [tierFilter, setTierFilter] = useState<"all" | "underpriced" | "overpriced">("all");

  const totalLeak = data.meta?.total_recoverable_leakage ?? belowFloor.reduce((acc, item) => acc + (item.revenue_opportunity || 0), 0);
  const totalVolumeOrders = data.meta?.volume_tier_counts?.total ?? volumeTier.length;
  const underpricedCount = data.meta?.volume_tier_counts?.underpriced ?? volumeTier.filter((v) => v.audit_result === "underpriced").length;
  const overpricedCount = data.meta?.volume_tier_counts?.overpriced ?? volumeTier.filter((v) => v.audit_result === "overpriced").length;

  const filteredVolumeTier = volumeTier.filter((item) => {
    if (tierFilter === "all") return true;
    return item.audit_result === tierFilter;
  });

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

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {belowFloor.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No products sold below floor price.
            </div>
          ) : (
            belowFloor.map((item, idx) => (
              <div key={idx} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition-colors">
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

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Volume-Tier Pricing Audit</h2>
            <p className="text-xs text-slate-500">Order size vs price tier policy (Distributor / Sub / Retail)</p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setTierFilter("all")}
            className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              tierFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Orders ({totalVolumeOrders})
          </button>
          <button
            onClick={() => setTierFilter("underpriced")}
            className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              tierFilter === "underpriced"
                ? "bg-rose-700 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Underpriced ({underpricedCount})
          </button>
          <button
            onClick={() => setTierFilter("overpriced")}
            className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              tierFilter === "overpriced"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Overpriced ({overpricedCount})
          </button>
        </div>

        {/* Volume Tier Items List */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {filteredVolumeTier.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching orders for selected filter.
            </div>
          ) : (
            filteredVolumeTier.slice(0, 50).map((item, idx) => (
              <div key={idx} className="p-3 text-xs space-y-1.5 hover:bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{item.product_raw}</span>
                    <div className="text-[11px] text-slate-500">
                      {item.customer} • Inv #{item.invoice_no}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
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

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                  <span>
                    Qty: <strong className="text-slate-800">{item.quantity}</strong> ({item.expected_tier})
                  </span>
                  <span>
                    Charged: <strong className="text-slate-800">{formatCurrency(item.rate, currency)}</strong> vs Tier: <strong className="text-slate-800">{formatCurrency(item.expected_price, currency)}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
          {filteredVolumeTier.length > 50 && (
            <div className="p-2.5 text-center text-[11px] text-slate-400 font-medium bg-slate-50">
              Showing first 50 of {filteredVolumeTier.length} audited orders
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
