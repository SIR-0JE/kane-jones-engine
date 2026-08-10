"use client";

import React, { useState } from "react";
import { Users, AlertOctagon, TrendingDown, DollarSign } from "lucide-react";
import { AnalyzeResponse, CustomerMarginItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

interface CustomersScreenProps {
  data: AnalyzeResponse;
}

export function CustomersScreen({ data }: CustomersScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const customers = data.customer_margin_detail || [];
  const lossCustomers = data.loss_making_customers || customers.filter((c) => c.gross_profit < 0);

  const [viewFilter, setViewFilter] = useState<"all" | "loss">("all");

  const displayed = viewFilter === "loss" ? lossCustomers : customers;

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* 1. Loss-Making Entity Highlight Banner */}
      {lossCustomers.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
              <AlertOctagon className="w-4 h-4 text-rose-700" />
              <span>Loss-Making Customer Accounts</span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-200 text-rose-900 rounded">
              {lossCustomers.length} Accounts in Red
            </span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            These accounts have negative cumulative gross profit (sales prices lower than depot cost).
          </p>
        </div>
      )}

      {/* 2. Customer List & Filter */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Customer Margin Detail ({customers.length})
          </h2>

          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setViewFilter("all")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                viewFilter === "all" ? "bg-white text-slate-900" : "text-slate-500"
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setViewFilter("loss")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                viewFilter === "loss" ? "bg-rose-700 text-white" : "text-rose-700 hover:text-rose-900"
              }`}
            >
              Loss-Making ({lossCustomers.length})
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {displayed.map((item, idx) => {
            const isLoss = item.gross_profit < 0;
            return (
              <div
                key={idx}
                className={`p-3.5 space-y-1.5 hover:bg-slate-50/60 transition-colors ${
                  isLoss ? "bg-rose-50/20" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900">{item.customer}</h3>
                      {isLoss && (
                        <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-100 text-rose-800 rounded uppercase">
                          Loss-Making
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {formatNumber(item.invoices)} invoices • Revenue: {formatCurrency(item.revenue, currency)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold block ${
                        isLoss ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(item.gross_profit, currency)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Margin: <strong className={isLoss ? "text-rose-700" : "text-slate-700"}>{formatPercent(item.margin_pct)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
