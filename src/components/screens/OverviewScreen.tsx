"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Users,
  Package,
  Layers,
  Sparkles,
  Loader2,
  FileDown,
  Presentation,
  Trash2,
  Pencil,
  X,
  Calculator,
  FileSpreadsheet,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { TabType } from "@/components/Navigation";
import { AnalyzeResponse, CompareResponse } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber, fetchComparison } from "@/lib/api";

interface OverviewScreenProps {
  data: AnalyzeResponse;
  onNavigate: (tab: TabType) => void;
  onDeleteAudit?: (periodLabel: string) => void;
  onRenameAudit?: (periodLabel: string, currentTitle: string) => void;
}

export function OverviewScreen({ data, onNavigate, onDeleteAudit, onRenameAudit }: OverviewScreenProps) {
  const meta = data.meta;
  const currency = meta?.currency_symbol || "₦";

  // Comparison toggle state
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [compLoading, setCompLoading] = useState<boolean>(false);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pptxLoading, setPptxLoading] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

  // Number formatting display mode: 'compact' (₦174.24M) or 'exact' (₦174,237,808.00)
  const [numberFormat, setNumberFormat] = useState<"compact" | "exact">("compact");

  // Metric Detail Modal State
  const [selectedMetric, setSelectedMetric] = useState<{
    step: string;
    title: string;
    value: number;
    formattedExact: string;
    formattedCompact: string;
    isDeduction?: boolean;
    description: string;
    formula: string;
    sourceSheet: string;
    targetTab?: TabType;
    details?: { label: string; value: string }[];
  } | null>(null);

  // Available dates / weeks for interactive comparison
  const availableDays = (data.daily_summary && data.daily_summary.length > 0)
    ? data.daily_summary.map((d: any) => d.date_only || d.date || "")
    : ["2026-07-01", "2026-07-02", "2026-07-03"];

  const availableWeeks = (data.weekly_summary && data.weekly_summary.length > 0)
    ? data.weekly_summary.map((w: any) => String(w.week_number || w.week || ""))
    : ["1", "2", "3", "4"];

  const [selectedDayA, setSelectedDayA] = useState<string>(availableDays[0] || "2026-07-01");
  const [selectedDayB, setSelectedDayB] = useState<string>(availableDays[1] || availableDays[0] || "2026-07-02");
  const [selectedWeekA, setSelectedWeekA] = useState<string>(availableWeeks[0] || "1");
  const [selectedWeekB, setSelectedWeekB] = useState<string>(availableWeeks[1] || availableWeeks[0] || "2");

  useEffect(() => {
    let isMounted = true;
    async function loadDiff() {
      setCompLoading(true);
      try {
        let keyA: string | undefined;
        let keyB: string | undefined;

        if (granularity === "day") {
          keyA = selectedDayA;
          keyB = selectedDayB;
        } else if (granularity === "week") {
          keyA = selectedWeekA;
          keyB = selectedWeekB;
        }

        const res = await fetchComparison(
          meta.client_id || "kane-jones",
          granularity,
          meta.period_label || "2026-07",
          granularity === "month" ? "2026-08" : (meta.period_label || "2026-07"),
          keyA,
          keyB
        );
        if (isMounted) {
          setComparison(res);
        }
      } catch (err) {
        console.error("Comparison fetch failed:", err);
      } finally {
        if (isMounted) setCompLoading(false);
      }
    }

    loadDiff();
    return () => {
      isMounted = false;
    };
  }, [granularity, selectedDayA, selectedDayB, selectedWeekA, selectedWeekB, meta.client_id, meta.period_label]);

  const belowFloorLeaks = data.below_floor_pricing || [];
  const totalLeakOpportunity = meta.total_recoverable_leakage ?? belowFloorLeaks.reduce((acc, item) => acc + (item.revenue_opportunity || 0), 0);
  const dominant = data.dominant_products?.[0];
  const lossCustomers = data.loss_making_customers || [];
  const belowFloorCount = meta.below_floor_items_count ?? belowFloorLeaks.length;
  const lossCustomersCount = meta.loss_making_customers_count ?? lossCustomers.length;

  const handleDownloadPdf = async () => {
    const clientId = meta?.client_id || "kane-jones";
    const periodLabel = meta?.period_label || "2026-07";
    setPdfLoading(true);
    try {
      const res = await fetch(
        `/api/report?client_id=${encodeURIComponent(clientId)}&period_label=${encodeURIComponent(periodLabel)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "PDF generation failed." }));
        throw new Error(err.detail || "Failed to download report");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientId}_${periodLabel}_audit_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Error downloading PDF: ${err.message || "Failed to generate report"}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPptx = async () => {
    const clientId = meta?.client_id || "kane-jones";
    const periodLabel = meta?.period_label || "2026-07";
    setPptxLoading(true);
    try {
      const res = await fetch(`/api/pptx?module=overview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          _ppt_module: "overview",
        }),
      });
      if (!res.ok) throw new Error("POST presentation generation failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientId}_${periodLabel}_executive_deck.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // Fallback via GET
      try {
        const res = await fetch(
          `/api/presentation?client_id=${encodeURIComponent(clientId)}&period_label=${encodeURIComponent(periodLabel)}`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Presentation generation failed." }));
          throw new Error(err.detail || "Failed to download presentation");
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${clientId}_${periodLabel}_executive_deck.pptx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err: any) {
        alert(`Error downloading presentation: ${err.message || "Failed to generate slides"}`);
      }
    } finally {
      setPptxLoading(false);
    }
  };


  const isCompact = numberFormat === "compact";
  const displayMoney = (val: number, isDeduction: boolean = false) => {
    const sign = isDeduction ? "−" : "";
    const formatted = formatCurrency(Math.abs(val), currency, isCompact);
    return `${sign}${formatted}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-slate-900 font-sora">
              Overview
            </h1>
            {onRenameAudit && (
              <button
                type="button"
                title="Rename this audit"
                onClick={() => onRenameAudit(meta?.period_label || "2026-07", meta?.audit_title || `${meta?.period_label} Full Audit`)}
                className="p-1 rounded-md text-slate-400 hover:text-[#7c6fff] hover:bg-purple-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 font-inter">
            {meta?.audit_title || `${meta?.period_label} Full Audit`}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Exact / Compact Number Format Switcher */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs mr-1">
            <button
              type="button"
              onClick={() => setNumberFormat("compact")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] font-sora transition-all ${
                numberFormat === "compact"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Compact (₦174M)
            </button>
            <button
              type="button"
              onClick={() => setNumberFormat("exact")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] font-sora transition-all ${
                numberFormat === "exact"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Exact (₦174,237,808)
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPptx}
            disabled={pptxLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold font-sora transition-all shadow-xs disabled:opacity-60"
          >
            {pptxLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5 text-[#7c6fff]" />}
            <span>Executive Slides (.pptx)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c6fff] hover:bg-[#6b5dfc] text-white text-xs font-semibold font-sora transition-all shadow-xs disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span>Download PDF Report</span>
          </button>

          {onDeleteAudit && (
            <button
              type="button"
              title="Delete this audit from depot"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 text-xs font-semibold font-sora transition-all shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Delete Audit</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Official 7 Financial Bridge Metrics (Primary Overview Cards with Red Negatives & Click-to-Drill) */}
      {(() => {
        const bridge = data.net_profit_bridge;
        const grossSales = bridge?.gross_sales_revenue ?? meta.total_revenue ?? 0;
        const salesReturns = bridge?.total_sales_returns ?? 0;
        const netSales = bridge?.net_sales_revenue ?? (grossSales - salesReturns);
        const grossCost = bridge?.gross_product_cost ?? bridge?.invoiced_cogs ?? bridge?.gross_embedded_cost ?? 0;
        const netCost = grossCost;
        const grossProfit = bridge?.gross_profit ?? bridge?.net_gross_profit_loss ?? (netSales - netCost);
        const grossMarginPct = bridge?.net_gross_margin_pct ?? (netSales > 0 ? grossProfit / netSales : 0);
        const opExpenses = bridge?.total_operating_expenses ?? 0;
        const netOpLoss = bridge?.net_profit ?? bridge?.net_operating_profit_loss ?? (grossProfit - opExpenses);
        const returnRate = bridge?.return_rate ?? (grossSales > 0 ? salesReturns / grossSales : 0);
        const netMarginPct = bridge?.net_operating_margin_pct ?? (netSales > 0 ? netOpLoss / netSales : 0);

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sora">
                    Official Financial Bridge &amp; Management P&amp;L
                  </h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                    Click any card for full details
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-inter">
                  Full 7-step P&amp;L reconciliation with sales returns, true product COGS, and operating expenses
                </p>
              </div>
              <button
                onClick={() => onNavigate("returns")}
                className="text-xs font-bold text-[#7c6fff] hover:underline flex items-center gap-1 font-sora self-start sm:self-auto"
              >
                <span>Returns Breakdown ({formatPercent(returnRate)})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Fix A: Missing accounting fields warning banner — visible whenever ledger inputs were omitted */}
            {bridge?.missing_accounting_fields && bridge.missing_accounting_fields.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex gap-3 items-start">
                <span className="text-amber-500 text-base mt-0.5">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-800 font-sora mb-1">
                    Incomplete P&amp;L — {bridge.missing_accounting_fields.length} accounting input{bridge.missing_accounting_fields.length > 1 ? "s" : ""} not supplied
                  </p>
                  <p className="text-[11px] text-amber-700 font-inter mb-1.5">
                    The following fields were not provided at upload and defaulted to ₦0. Figures for COGS, gross profit, and net profit are <strong>estimates only</strong> until these are supplied:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {bridge.missing_accounting_fields.map((f: string) => (
                      <span
                        key={f}
                        className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-md font-mono"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 7-Step Financial Bridge Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* Step 1: Gross Sales */}
              <div
                onClick={() =>
                  setSelectedMetric({
                    step: "Step 1",
                    title: "Gross Sales Revenue",
                    value: grossSales,
                    formattedExact: formatCurrency(grossSales, currency, false),
                    formattedCompact: formatCurrency(grossSales, currency, true),
                    description: "Total invoice value across all sales invoices issued during the audit period, including container empties deposits.",
                    formula: "Sum of (Invoice Line Quantity × Unit Selling Price) for all day reports",
                    sourceSheet: "Day Reports / Sales Register",
                    targetTab: "daily",
                    details: [
                      { label: "Total Invoices", value: formatNumber(meta.total_invoices) },
                      { label: "Date Range", value: `${meta.date_range?.start || "N/A"} to ${meta.date_range?.end || "N/A"}` },
                      { label: "Currency", value: currency },
                    ],
                  })
                }
                className="bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between transition-all"
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sora">
                  1. Gross Sales
                </span>
                <div className="mt-2">
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight font-sora truncate">
                    {displayMoney(grossSales, false)}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1">
                    {formatNumber(meta.total_invoices)} invoices
                  </span>
                </div>
              </div>

              {/* Step 2: Less Returns (RED DEDUCTION) */}
              <div
                onClick={() =>
                  setSelectedMetric({
                    step: "Step 2",
                    title: "Total Sales Returns & Credit Notes",
                    value: salesReturns,
                    formattedExact: `−${formatCurrency(salesReturns, currency, false)}`,
                    formattedCompact: `−${formatCurrency(salesReturns, currency, true)}`,
                    isDeduction: true,
                    description: "Total value of credit notes issued to customers for returned products and empty crates/bottles.",
                    formula: "Sum of (Return Quantity × Unit Return Price) from Sales Returns Sheet",
                    sourceSheet: "Sales Returns & Credit Notes Day-Book",
                    targetTab: "returns",
                    details: [
                      { label: "Product Returns", value: formatCurrency(bridge?.product_returns_value || 0, currency, false) },
                      { label: "Empties / Crates Returns", value: formatCurrency(bridge?.empties_returns_value || 0, currency, false) },
                      { label: "Total Returns Credited", value: formatCurrency(salesReturns, currency, false) },
                      { label: "Return Rate (% Gross)", value: formatPercent(returnRate) },
                    ],
                  })
                }
                className="bg-rose-50/60 hover:bg-rose-100/50 hover:border-rose-300 hover:shadow-sm cursor-pointer p-3.5 sm:p-4 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between transition-all"
              >
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-sora">
                  2. Less Returns
                </span>
                <div className="mt-2">
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-rose-700 tracking-tight font-sora truncate">
                    {displayMoney(salesReturns, true)}
                  </div>
                  <span className="text-[11px] text-rose-600 font-medium block mt-1">
                    {formatPercent(returnRate)} of sales
                  </span>
                </div>
              </div>

              {/* Step 3: Net Sales */}
              <div
                onClick={() =>
                  setSelectedMetric({
                    step: "Step 3",
                    title: "Net Sales Revenue",
                    value: netSales,
                    formattedExact: formatCurrency(netSales, currency, false),
                    formattedCompact: formatCurrency(netSales, currency, true),
                    description: "Actual retained revenue base available to cover product purchase costs and depot operating expenses.",
                    formula: "Gross Sales Revenue − Total Sales Returns",
                    sourceSheet: "Gross Sales less Credit Notes Reconciliation",
                    details: [
                      { label: "Gross Sales Base", value: formatCurrency(grossSales, currency, false) },
                      { label: "Less Returns", value: `−${formatCurrency(salesReturns, currency, false)}` },
                      { label: "Net Available", value: formatCurrency(netSales, currency, false) },
                    ],
                  })
                }
                className="bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between transition-all"
              >
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-sora">
                  3. Net Sales
                </span>
                <div className="mt-2">
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight font-sora truncate">
                    {displayMoney(netSales, false)}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1">
                    Available base
                  </span>
                </div>
              </div>

              {/* Step 4: Total Product Cost (COGS - RED DEDUCTION) */}
              <div
                onClick={() =>
                  setSelectedMetric({
                    step: "Step 4",
                    title: "Total Product Cost (COGS)",
                    value: netCost,
                    formattedExact: `−${formatCurrency(netCost, currency, false)}`,
                    formattedCompact: `−${formatCurrency(netCost, currency, true)}`,
                    isDeduction: true,
                    description: "Total cost basis of products invoiced and sold to customers during the audit month.",
                    formula: "Sum of (Invoice Line Quantity × Unit Valuation Cost)",
                    sourceSheet: "Sales Invoice Product Line Items & Inventory Valuation",
                    targetTab: "products",
                    details: [
                      { label: "Invoiced Product Cost", value: formatCurrency(netCost, currency, false) },
                      { label: "Opening Inventory (Ledger)", value: formatCurrency(bridge?.opening_inventory || 0, currency, false) },
                      { label: "Supplier Purchases (Ledger)", value: formatCurrency(bridge?.purchases || 0, currency, false) },
                      { label: "Closing Inventory (Ledger)", value: formatCurrency(bridge?.closing_inventory || 0, currency, false) },
                    ],
                  })
                }
                className="bg-rose-50/60 hover:bg-rose-100/50 hover:border-rose-300 hover:shadow-sm cursor-pointer p-3.5 sm:p-4 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between transition-all"
              >
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-sora">
                  4. Total Product Cost
                </span>
                <div className="mt-2">
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-rose-700 tracking-tight font-sora truncate">
                    {displayMoney(netCost, true)}
                  </div>
                  <span className="text-[11px] text-rose-600 font-medium block mt-1">
                    Cost of Goods Sold
                  </span>
                </div>
              </div>

              {/* Step 5: Gross Profit (Green if positive, Red if negative) */}
              <div
                onClick={() =>
                  setSelectedMetric({
                    step: "Step 5",
                    title: "Gross Profit / (Loss)",
                    value: grossProfit,
                    formattedExact: `${grossProfit >= 0 ? "+" : ""}${formatCurrency(grossProfit, currency, false)}`,
                    formattedCompact: `${grossProfit >= 0 ? "+" : ""}${formatCurrency(grossProfit, currency, true)}`,
                    description: "Trading gross profit after deducting true product purchase cost and sales returns from gross revenue.",
                    formula: "Net Sales Revenue − Total Product Cost",
                    sourceSheet: "Trading P&L Calculation",
                    details: [
                      { label: "Net Sales", value: formatCurrency(netSales, currency, false) },
                      { label: "Product Cost", value: `−${formatCurrency(netCost, currency, false)}` },
                      { label: "Gross Margin %", value: formatPercent(grossMarginPct) },
                    ],
                  })
                }
                className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border shadow-xs flex flex-col justify-between transition-all ${
                  grossProfit >= 0
                    ? "bg-emerald-50/60 hover:bg-emerald-100/50 border-emerald-200 text-emerald-700"
                    : "bg-rose-50/60 hover:bg-rose-100/50 border-rose-200 text-rose-700"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider font-sora">
                  5. Gross Profit
                </span>
                <div className="mt-2">
                  <div className="text-base sm:text-lg lg:text-xl font-bold tracking-tight font-sora truncate">
                    {grossProfit >= 0 ? "+" : ""}{displayMoney(grossProfit, false)}
                  </div>
                  <span className="text-[11px] font-medium block mt-1">
                    {formatPercent(grossMarginPct)} margin
                  </span>
                </div>
              </div>

              {/* Step 6: Operating Expenses (RED DEDUCTION) */}
              <div
                onClick={() =>
                  setSelectedMetric({
                    step: "Step 6",
                    title: "Total Operating Expenses (OpEx)",
                    value: opExpenses,
                    formattedExact: `−${formatCurrency(opExpenses, currency, false)}`,
                    formattedCompact: `−${formatCurrency(opExpenses, currency, true)}`,
                    isDeduction: true,
                    description: "Total overhead, vehicle maintenance, logistics, salaries, generator fuel, and payment voucher expenses for the month.",
                    formula: "Sum of all categorized depot expense items and payment vouchers",
                    sourceSheet: "Operating Expenses Day-Book",
                    targetTab: "expenses",
                    details: [
                      { label: "Total Recorded", value: formatCurrency(opExpenses, currency, false) },
                      { label: "Categories", value: `${data.expenses_analysis?.categories?.length || 0} categories` },
                      { label: "% of Net Sales", value: netSales > 0 ? formatPercent(opExpenses / netSales) : "0%" },
                    ],
                  })
                }
                className="bg-rose-50/60 hover:bg-rose-100/50 hover:border-rose-300 hover:shadow-sm cursor-pointer p-3.5 sm:p-4 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between transition-all"
              >
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-sora">
                  6. Op. Expenses
                </span>
                <div className="mt-2">
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-rose-700 tracking-tight font-sora truncate">
                    {displayMoney(opExpenses, true)}
                  </div>
                  <span className="text-[11px] text-rose-600 font-medium block mt-1">
                    Operating vouchers
                  </span>
                </div>
              </div>

              {/* Step 7: Net Operating Profit / Loss */}
              <div
                onClick={() =>
                  setSelectedMetric({
                    step: "Step 7",
                    title: "Net Operating Profit / (Loss)",
                    value: netOpLoss,
                    formattedExact: formatCurrency(netOpLoss, currency, false),
                    formattedCompact: formatCurrency(netOpLoss, currency, true),
                    description: "Final bottom-line depot financial performance after accounting for all revenues, returns, product COGS, and operating expenses.",
                    formula: "Gross Profit − Total Operating Expenses",
                    sourceSheet: "Executive Management P&L Bridge",
                    details: [
                      { label: "Gross Profit Base", value: formatCurrency(grossProfit, currency, false) },
                      { label: "Operating Expenses", value: `−${formatCurrency(opExpenses, currency, false)}` },
                      { label: "Net Margin %", value: formatPercent(netMarginPct) },
                    ],
                  })
                }
                className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border shadow-xs flex flex-col justify-between transition-all ${
                  netOpLoss < 0
                    ? "bg-rose-100/80 hover:bg-rose-200/80 border-rose-300 text-rose-900"
                    : "bg-emerald-100/80 hover:bg-emerald-200/80 border-emerald-300 text-emerald-900"
                }`}
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider font-sora">
                  7. Net Profit / (Loss)
                </span>
                <div className="mt-2">
                  <div className="text-base sm:text-lg lg:text-xl font-black tracking-tight font-sora truncate">
                    {displayMoney(netOpLoss, false)}
                  </div>
                  <span className="text-[11px] font-bold block mt-1">
                    {formatPercent(netMarginPct)} of net sales
                  </span>
                </div>
              </div>
            </div>

            {/* Dedicated Trading, Profit & Loss Breakdown (P&L) Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#7c6fff]/10 rounded-lg text-[#7c6fff]">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 font-sora">
                      Trading, Profit &amp; Loss Statement (P&amp;L Breakdown)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-inter">
                      Formal accounting schedule reconciling customer sales, warehouse inventory movement &amp; operating overhead
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-sora">
                  {meta.period_label || "Period"}
                </span>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="w-full text-xs font-inter">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold font-sora text-[11px]">
                      <th className="py-2 text-left">Accounting Line Item</th>
                      <th className="py-2 text-right">Sub-Total</th>
                      <th className="py-2 text-right">Total ({currency})</th>
                      <th className="py-2 text-right">% of Net Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* TRADING ACCOUNT */}
                    <tr className="bg-slate-50/60 font-bold font-sora text-slate-800">
                      <td colSpan={4} className="py-2.5 px-2 uppercase tracking-wide text-[10px]">
                        1. TRADING ACCOUNT (Sales &amp; Warehouse Movement)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 text-slate-800 font-medium">Gross Invoiced Sales Revenue</td>
                      <td className="py-2 text-right text-slate-600">{formatCurrency(grossSales, currency, false)}</td>
                      <td className="py-2 text-right text-slate-400">—</td>
                      <td className="py-2 text-right text-slate-500">{formatPercent(netSales > 0 ? grossSales / netSales : 1)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 text-rose-700 font-medium">Less: Customer Sales Returns &amp; Credit Notes</td>
                      <td className="py-2 text-right text-rose-700">−{formatCurrency(salesReturns, currency, false)}</td>
                      <td className="py-2 text-right text-slate-400">—</td>
                      <td className="py-2 text-right text-rose-600 font-medium">−{formatPercent(returnRate)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold font-sora text-slate-900 border-t border-slate-200">
                      <td className="py-2.5 pl-2">NET SALES REVENUE</td>
                      <td className="py-2.5 text-right text-slate-400">—</td>
                      <td className="py-2.5 text-right font-extrabold">{formatCurrency(netSales, currency, false)}</td>
                      <td className="py-2.5 text-right">100.0%</td>
                    </tr>

                    {/* Stock Balances & Purchases */}
                    {(bridge?.opening_inventory || bridge?.purchases || bridge?.closing_inventory) ? (
                      <>
                        <tr className="text-slate-700">
                          <td className="py-2 pl-4">Opening Inventory Balance (Stock Sheet)</td>
                          <td className="py-2 text-right text-slate-600">{formatCurrency(bridge?.opening_inventory || 0, currency, false)}</td>
                          <td className="py-2 text-right text-slate-400">—</td>
                          <td className="py-2 text-right text-slate-400">—</td>
                        </tr>
                        <tr className="text-slate-700">
                          <td className="py-2 pl-4">Add: Purchases from Supplier (Purchases Daybook)</td>
                          <td className="py-2 text-right text-slate-600">+{formatCurrency(bridge?.purchases || 0, currency, false)}</td>
                          <td className="py-2 text-right text-slate-400">—</td>
                          <td className="py-2 text-right text-slate-400">—</td>
                        </tr>
                        {bridge?.purchase_returns ? (
                          <tr className="text-rose-700">
                            <td className="py-2 pl-4">Less: Purchase Returns / Supplier Debit Notes</td>
                            <td className="py-2 text-right">−{formatCurrency(bridge.purchase_returns, currency, false)}</td>
                            <td className="py-2 text-right text-slate-400">—</td>
                            <td className="py-2 text-right text-slate-400">—</td>
                          </tr>
                        ) : null}
                        <tr className="text-slate-700">
                          <td className="py-2 pl-4">Less: Closing Inventory Balance (Stock Sheet)</td>
                          <td className="py-2 text-right text-slate-600">−{formatCurrency(bridge?.closing_inventory || 0, currency, false)}</td>
                          <td className="py-2 text-right text-slate-400">—</td>
                          <td className="py-2 text-right text-slate-400">—</td>
                        </tr>
                      </>
                    ) : null}

                    <tr>
                      <td className="py-2 pl-4 text-rose-700 font-medium">Total Invoiced Product Cost of Goods Sold (COGS)</td>
                      <td className="py-2 text-right text-rose-700">−{formatCurrency(netCost, currency, false)}</td>
                      <td className="py-2 text-right text-rose-700 font-bold">−{formatCurrency(netCost, currency, false)}</td>
                      <td className="py-2 text-right text-rose-600">−{formatPercent(netSales > 0 ? netCost / netSales : 0)}</td>
                    </tr>

                    <tr className={`font-bold font-sora border-t-2 border-slate-300 ${grossProfit >= 0 ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
                      <td className="py-2.5 pl-2">GROSS TRADING PROFIT / (LOSS)</td>
                      <td className="py-2.5 text-right text-slate-400">—</td>
                      <td className="py-2.5 text-right font-extrabold">{formatCurrency(grossProfit, currency, false)}</td>
                      <td className="py-2.5 text-right font-extrabold">{formatPercent(grossMarginPct)}</td>
                    </tr>

                    {/* PROFIT & LOSS ACCOUNT */}
                    <tr className="bg-slate-50/60 font-bold font-sora text-slate-800">
                      <td colSpan={4} className="py-2.5 px-2 uppercase tracking-wide text-[10px]">
                        2. PROFIT &amp; LOSS ACCOUNT (Operating Overhead &amp; Net Result)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pl-4 text-slate-800 font-medium">Gross Trading Profit Brought Down</td>
                      <td className="py-2 text-right text-slate-400">—</td>
                      <td className={`py-2 text-right font-bold ${grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {formatCurrency(grossProfit, currency, false)}
                      </td>
                      <td className="py-2 text-right text-slate-500">{formatPercent(grossMarginPct)}</td>
                    </tr>
                    {bridge?.other_income ? (
                      <tr>
                        <td className="py-2 pl-4 text-emerald-700 font-medium">Add: Other Operating Income</td>
                        <td className="py-2 text-right text-emerald-700">+{formatCurrency(bridge.other_income, currency, false)}</td>
                        <td className="py-2 text-right text-slate-400">—</td>
                        <td className="py-2 text-right text-emerald-600">+{formatPercent(netSales > 0 ? bridge.other_income / netSales : 0)}</td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className="py-2 pl-4 text-rose-700 font-medium">Less: Total Operating Expenses (OpEx Vouchers)</td>
                      <td className="py-2 text-right text-rose-700">−{formatCurrency(opExpenses, currency, false)}</td>
                      <td className="py-2 text-right text-rose-700 font-bold">−{formatCurrency(opExpenses, currency, false)}</td>
                      <td className="py-2 text-right text-rose-600">−{formatPercent(netSales > 0 ? opExpenses / netSales : 0)}</td>
                    </tr>
                    {bridge?.finance_costs ? (
                      <tr>
                        <td className="py-2 pl-4 text-rose-700 font-medium">Less: Finance &amp; Banking Costs</td>
                        <td className="py-2 text-right text-rose-700">−{formatCurrency(bridge.finance_costs, currency, false)}</td>
                        <td className="py-2 text-right text-slate-400">—</td>
                        <td className="py-2 text-right text-rose-600">−{formatPercent(netSales > 0 ? bridge.finance_costs / netSales : 0)}</td>
                      </tr>
                    ) : null}

                    <tr className={`font-bold font-sora border-t-2 border-slate-400 ${netOpLoss >= 0 ? "bg-emerald-100 text-emerald-950" : "bg-rose-100 text-rose-950"}`}>
                      <td className="py-3 pl-2 text-[13px] font-black">NET OPERATING PROFIT / (LOSS)</td>
                      <td className="py-3 text-right text-slate-400">—</td>
                      <td className="py-3 text-right text-[13px] font-black">{formatCurrency(netOpLoss, currency, false)}</td>
                      <td className="py-3 text-right text-[13px] font-black">{formatPercent(netMarginPct)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}


      {/* 2. Interactive Period-Over-Period Comparison Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#7c6fff]/10 rounded-lg text-[#7c6fff]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sora">
                Comparative Analytics ({granularity.toUpperCase()})
              </h2>
              <p className="text-xs text-slate-500">Benchmark variance across key metrics</p>
            </div>
          </div>

          {/* Granularity Toggle */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  granularity === g
                    ? "bg-[#7c6fff] text-white font-sora shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Baseline & Comparison Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          {granularity === "day" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 shrink-0 font-sora">Baseline Day:</label>
                <select
                  value={selectedDayA}
                  onChange={(e) => setSelectedDayA(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c6fff]"
                >
                  {availableDays.map((d) => (
                    <option key={`base-${d}`} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 shrink-0 font-sora">Comparison Day:</label>
                <select
                  value={selectedDayB}
                  onChange={(e) => setSelectedDayB(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c6fff]"
                >
                  {availableDays.map((d) => (
                    <option key={`comp-${d}`} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {granularity === "week" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 shrink-0 font-sora">Baseline Week:</label>
                <select
                  value={selectedWeekA}
                  onChange={(e) => setSelectedWeekA(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c6fff]"
                >
                  {availableWeeks.map((w) => (
                    <option key={`base-w-${w}`} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 shrink-0 font-sora">Comparison Week:</label>
                <select
                  value={selectedWeekB}
                  onChange={(e) => setSelectedWeekB(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7c6fff]"
                >
                  {availableWeeks.map((w) => (
                    <option key={`comp-w-${w}`} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {granularity === "month" && (
            <div className="sm:col-span-2 text-xs text-slate-500 font-medium flex items-center justify-between">
              <span>Baseline: Current Month ({meta.period_label || "2026-07"})</span>
              <span>Comparison: Adjacent Audited Period</span>
            </div>
          )}
        </div>

        {compLoading ? (
          <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium">Computing comparison deltas...</span>
          </div>
        ) : comparison ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
              <span>Baseline: {comparison.period_a_label}</span>
              <span>Comparison: {comparison.period_b_label}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Revenue Diff */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Revenue Delta</span>
                <div className={`text-base font-bold mt-1 ${comparison.summary.revenue.absolute_change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.revenue.formatted}
                </div>
              </div>

              {/* Profit Diff */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Gross Profit Delta</span>
                <div className={`text-base font-bold mt-1 ${comparison.summary.gross_profit.absolute_change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.gross_profit.formatted}
                </div>
              </div>

              {/* Margin Diff */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Margin Delta</span>
                <div className={`text-base font-bold mt-1 ${comparison.summary.margin_pct.diff_pct_points >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {comparison.summary.margin_pct.formatted}
                </div>
              </div>

              {/* Invoices Diff */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Invoices Delta</span>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {comparison.summary.invoices.formatted}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Select a granularity to calculate comparison metrics.
          </div>
        )}
      </div>

      {/* 3. Executive Action Cards Grid (3 Columns on Desktop) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Key Audit Findings & Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pricing Leaks Callout */}
          <div
            onClick={() => onNavigate("pricing")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full">
                  {belowFloorCount} items
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Below-Floor Pricing</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Total recoverable leakage:{" "}
                  <span className="font-semibold text-rose-700 block mt-0.5">
                    {formatCurrency(totalLeakOpportunity, currency, true)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 text-xs font-semibold text-rose-700">
              <span>View pricing audit</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Dominant Product Concentration */}
          <div
            onClick={() => onNavigate("products")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                  <Package className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {dominant ? formatPercent(dominant.pct_of_total) : "0%"} share
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Product Concentration</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-800">{dominant?.product_raw || "Top SKU"}</span> accounts for{" "}
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {formatCurrency(dominant?.revenue || 0, currency, true)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 text-xs font-semibold text-amber-700">
              <span>View products</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Loss-Making Customers */}
          <div
            onClick={() => onNavigate("customers")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-700">
                  <Users className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full">
                  {lossCustomersCount} accounts
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Negative Margin Accounts</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Top loss customer:{" "}
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {lossCustomers[0]?.customer || "None"} ({formatCurrency(lossCustomers[0]?.gross_profit || 0, currency, true)})
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 text-xs font-semibold text-rose-700">
              <span>View customers</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Metric Detail Drilldown Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-block px-2 py-0.5 bg-purple-100 text-[#7c6fff] text-[10px] font-bold rounded uppercase tracking-wider font-sora">
                  {selectedMetric.step} • Management Metric
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 font-sora">
                  {selectedMetric.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMetric(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exact Figure Callout */}
            <div className={`p-4 rounded-xl border ${selectedMetric.isDeduction ? "bg-rose-50/70 border-rose-200 text-rose-800" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
              <span className="text-[11px] font-medium text-slate-500 block">Exact Financial Value</span>
              <div className="text-2xl font-black tracking-tight font-sora mt-0.5">
                {selectedMetric.formattedExact}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-2">
                <span>Compact representation:</span>
                <span className="px-2 py-0.5 bg-white/80 border border-slate-200 rounded font-bold text-slate-800">
                  {selectedMetric.formattedCompact}
                </span>
              </div>
            </div>

            {/* Description & Formula */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 block font-sora mb-1">Executive Definition</span>
                <p className="text-slate-600 leading-relaxed font-inter bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {selectedMetric.description}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block font-sora mb-1 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#7c6fff]" />
                  <span>Calculation Formula</span>
                </span>
                <p className="text-slate-700 font-mono text-[11px] bg-slate-100/80 p-2.5 rounded-lg border border-slate-200">
                  {selectedMetric.formula}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block font-sora mb-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Audit Source Data</span>
                </span>
                <p className="text-slate-600 font-inter text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {selectedMetric.sourceSheet}
                </p>
              </div>

              {selectedMetric.details && selectedMetric.details.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-700 block font-sora mb-1.5">Underlying Factors</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedMetric.details.map((d, i) => (
                      <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">{d.label}</span>
                        <span className="text-xs font-bold text-slate-800 font-sora">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMetric(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold font-sora transition-all"
              >
                Close
              </button>
              {selectedMetric.targetTab && (
                <button
                  type="button"
                  onClick={() => {
                    const tab = selectedMetric.targetTab!;
                    setSelectedMetric(null);
                    onNavigate(tab);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#7c6fff] hover:bg-[#6b5dfc] text-white text-xs font-semibold font-sora transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>Go to {selectedMetric.targetTab.charAt(0).toUpperCase() + selectedMetric.targetTab.slice(1)} Screen</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && onDeleteAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sora">Delete Monthly Audit?</h3>
                <p className="text-xs text-slate-500 font-inter">{meta?.audit_title || meta?.period_label}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-inter">
              Are you sure you want to delete the <span className="font-bold text-slate-900">{meta?.period_label}</span> audit? This will permanently remove its recorded analysis data, reports, and leak diagnostics from your depot history.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold font-sora transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDeleteAudit(meta?.period_label || "2026-07");
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold font-sora transition-all shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Audit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
