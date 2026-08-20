"use client";

import React, { useState } from "react";
import {
  Users,
  AlertOctagon,
  Search,
  X,
  ChevronRight,
  Target,
  TrendingDown,
  TrendingUp,
  FileText,
  Presentation,
  Loader2,
} from "lucide-react";
import { AnalyzeResponse, CustomerMarginItem, TrueCostMarketerItem } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/api";

const ANALYSIS_API_URL = process.env.NEXT_PUBLIC_ANALYSIS_API_URL || "";

interface CustomersScreenProps {
  data: AnalyzeResponse;
}

export function CustomersScreen({ data }: CustomersScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const rawInvoiceCustomers = data.customer_margin_detail || [];
  const trueCostMarketers: TrueCostMarketerItem[] = data.true_cost_marketers || [];

  const [activeTab, setActiveTab] = useState<"true_cost" | "invoice">("true_cost");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewFilter, setViewFilter] = useState<"all" | "loss" | "profit">("all");
  const [drillCustomer, setDrillCustomer] = useState<TrueCostMarketerItem | null>(null);
  const [pptxLoading, setPptxLoading] = useState<boolean>(false);

  // Loss accounts count
  const trueCostLossCount = trueCostMarketers.filter((c) => (c.total_gross_profit || 0) < 0).length;
  const invoiceLossCount = rawInvoiceCustomers.filter((c) => (c.gross_profit || 0) < 0).length;

  const filteredTrueCost = trueCostMarketers.filter((item) => {
    const matchesSearch = item.customer.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (viewFilter === "loss") return (item.total_gross_profit || 0) < 0;
    if (viewFilter === "profit") return (item.total_gross_profit || 0) >= 0;
    return true;
  });

  const filteredInvoice = rawInvoiceCustomers.filter((item) => {
    const matchesSearch = item.customer.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (viewFilter === "loss") return (item.gross_profit || 0) < 0;
    if (viewFilter === "profit") return (item.gross_profit || 0) >= 0;
    return true;
  });

  // Find invoice detail rows for a drilled customer
  const drillInvoices = drillCustomer
    ? rawInvoiceCustomers.filter(
        (c) => c.customer.toLowerCase() === drillCustomer.customer.toLowerCase()
      )
    : [];

  // PPT export — Customers module
  const handleDownloadPptx = async () => {
    const periodLabel = data.meta?.period_label || "unknown";
    const clientId = data.meta?.client_id || "kane-jones";
    const apiBase = ANALYSIS_API_URL || "";
    setPptxLoading(true);
    try {
      const res = await fetch(`/api/pptx?module=customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          _ppt_module: "customers",
        }),
      });
      if (!res.ok) throw new Error("PPT generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientId}_${periodLabel}_customers.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: try direct endpoint
      const res = await fetch(`/api/presentation?client_id=${encodeURIComponent(clientId)}&period_label=${encodeURIComponent(periodLabel)}&module=customers`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${clientId}_${periodLabel}_customers.pptx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setPptxLoading(false);
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-[#7c6fff]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 font-sora">
                Customer Account Intelligence
              </h1>
              <p className="text-xs text-slate-500 font-inter">
                Customer accounts, invoice-level margins &amp; true-cost profitability (§7)
              </p>

            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PPT Export */}
          <button
            onClick={handleDownloadPptx}
            disabled={pptxLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold font-sora shadow hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            {pptxLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5 text-[#7c6fff]" />}
            <span>Export Slides</span>
          </button>

          {/* Tab Switcher */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("true_cost")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sora transition-all ${
                activeTab === "true_cost"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              True-Cost Accounts ({trueCostMarketers.length || 43})
            </button>
            <button
              onClick={() => setActiveTab("invoice")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sora transition-all ${
                activeTab === "invoice"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Invoice Margins ({rawInvoiceCustomers.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Loss-Making Alert Banner */}
      {trueCostLossCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs font-sora">
              <AlertOctagon className="w-4 h-4 text-rose-700" />
              <span>Loss-Making Customer Accounts (Negative Net Margin)</span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-200 text-rose-900 rounded font-sora">
              {trueCostLossCount} Accounts in Red
            </span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed font-inter">
            These accounts have negative cumulative gross profit (effective selling prices below period inventory cost basis).
          </p>
        </div>
      )}

      {/* 3. Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c6fff]/30 focus:border-[#7c6fff]"
          />
        </div>

        <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setViewFilter("all")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              viewFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
            }`}
          >
            All Accounts
          </button>
          <button
            onClick={() => setViewFilter("loss")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              viewFilter === "loss"
                ? "bg-rose-700 text-white shadow-2xs"
                : "text-rose-700 hover:text-rose-900"
            }`}
          >
            In the Red ({activeTab === "true_cost" ? trueCostLossCount : invoiceLossCount})
          </button>
          <button
            onClick={() => setViewFilter("profit")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              viewFilter === "profit"
                ? "bg-emerald-700 text-white shadow-2xs"
                : "text-emerald-700 hover:text-emerald-900"
            }`}
          >
            Profitable
          </button>
        </div>
      </div>

      {/* 4. Accounts Table */}
      {activeTab === "true_cost" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold font-sora">
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-3 text-center">Invoices</th>
                  <th className="py-3 px-3 text-right">Cases Sold</th>
                  <th className="py-3 px-4 text-right">Revenue (excl. empties)</th>
                  <th className="py-3 px-4 text-right">True Cost (tmp3F5D)</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4 text-right">Margin %</th>
                  <th className="py-3 px-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-inter">
                {filteredTrueCost.length > 0 ? (
                  filteredTrueCost.map((item, idx) => {
                    const isLoss = (item.total_gross_profit || 0) < 0;
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isLoss ? "bg-rose-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{item.customer}</span>
                            {isLoss && (
                              <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-100 text-rose-800 rounded uppercase font-sora">
                                Red
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 font-semibold">
                          {item.invoices}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 font-semibold">
                          {formatNumber(item.total_cases_sold)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {formatCurrency(item.total_revenue, currency)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 font-medium">
                          {formatCurrency(item.total_cost, currency)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            isLoss ? "text-rose-700" : "text-emerald-700"
                          }`}
                        >
                          {formatCurrency(item.total_gross_profit, currency)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-extrabold ${
                            isLoss ? "text-rose-700" : "text-slate-800"
                          }`}
                        >
                          {formatPercent(item.gross_profit_pct)}
                        </td>
                        {/* Drill-down */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setDrillCustomer(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#7c6fff]/10 text-slate-500 hover:text-[#7c6fff] transition-colors"
                            title="View customer detail"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No customer accounts match your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

          </div>
        </div>
      ) : (
        /* Invoice Margins List */
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
          {filteredInvoice.map((item, idx) => {
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
                      <h3 className="text-xs font-bold text-slate-900 font-sora">{item.customer}</h3>
                      {isLoss && (
                        <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-100 text-rose-800 rounded uppercase font-sora">
                          Loss-Making
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-inter">
                      {formatNumber(item.invoices)} invoices • Revenue: {formatCurrency(item.revenue, currency, true)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold block font-sora ${
                        isLoss ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(item.gross_profit, currency, true)}
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
      )}

      {/* 5. Customer Drill-Down Modal */}
      {drillCustomer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 font-sora">{drillCustomer.customer}</h2>
                <p className="text-xs text-slate-500 font-inter">Customer Detail — {data.meta?.period_label}</p>
              </div>
              <button
                onClick={() => setDrillCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
              {[
                { label: "Cases Sold", value: formatNumber(drillCustomer.total_cases_sold) },
                { label: "Revenue", value: formatCurrency(drillCustomer.total_revenue, currency, true) },
                { label: "True Cost", value: formatCurrency(drillCustomer.total_cost, currency, true) },
                {
                  label: "Gross Profit",
                  value: formatCurrency(drillCustomer.total_gross_profit, currency, true),
                  highlight: (drillCustomer.total_gross_profit || 0) < 0 ? "text-rose-700" : "text-emerald-700",
                },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] text-slate-500 font-inter">{kpi.label}</p>
                  <p className={`text-sm font-extrabold font-sora ${kpi.highlight || "text-slate-900"}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Tags row */}
            <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
              {/* Profitable / Loss Tag */}
              {(drillCustomer.total_gross_profit || 0) >= 0 ? (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold font-sora">
                  <TrendingUp className="w-3 h-3" /> Profitable
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-bold font-sora">
                  <TrendingDown className="w-3 h-3" /> Loss Account
                </span>
              )}
              {/* Margin */}
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold font-inter">
                Margin: {formatPercent(drillCustomer.gross_profit_pct)}
              </span>
              {/* Invoices */}
              <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold font-inter">
                <FileText className="w-3 h-3" /> {drillCustomer.invoices} invoices
              </span>
            </div>


            {/* Invoice Margin Detail */}
            {drillInvoices.length > 0 && (
              <div className="px-5 pb-5">
                <h3 className="text-[11px] font-bold text-slate-700 mb-2 font-sora uppercase tracking-wide">Invoice-Level Margins</h3>
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-bold font-sora">
                        <th className="py-2 px-3 text-left">Customer</th>
                        <th className="py-2 px-3 text-right">Invoices</th>
                        <th className="py-2 px-3 text-right">Revenue</th>
                        <th className="py-2 px-3 text-right">Cost</th>
                        <th className="py-2 px-3 text-right">Gross Profit</th>
                        <th className="py-2 px-3 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-inter">
                      {drillInvoices.map((inv, i) => {
                        const loss = inv.gross_profit < 0;
                        return (
                          <tr key={i} className={loss ? "bg-rose-50/40" : ""}>
                            <td className="py-2 px-3 font-semibold text-slate-900">{inv.customer}</td>
                            <td className="py-2 px-3 text-right text-slate-500">{inv.invoices}</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(inv.revenue, currency, true)}</td>
                            <td className="py-2 px-3 text-right text-slate-500">{formatCurrency(inv.cost, currency, true)}</td>
                            <td className={`py-2 px-3 text-right font-bold ${loss ? "text-rose-700" : "text-emerald-700"}`}>
                              {formatCurrency(inv.gross_profit, currency, true)}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${loss ? "text-rose-700" : "text-slate-700"}`}>
                              {formatPercent(inv.margin_pct)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
