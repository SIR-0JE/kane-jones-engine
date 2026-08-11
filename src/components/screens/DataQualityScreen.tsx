"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, FileSpreadsheet } from "lucide-react";
import { AnalyzeResponse } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/api";

interface DataQualityScreenProps {
  data: AnalyzeResponse;
}

export function DataQualityScreen({ data }: DataQualityScreenProps) {
  const currency = data.meta?.currency_symbol || "₦";
  const reconciliation = data.reconciliation_discrepancies || [];
  const matchQuality = data.match_quality;
  const anomalies = data.anomalies || [];

  const totalInvoices = data.meta?.total_invoices || 0;
  const reconciledCount = data.meta?.reconciled_invoices_count ?? (totalInvoices - reconciliation.length);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-12 w-full">
      {/* 1. Reconciliation Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Data-Integrity Reconciliation</h2>
            <p className="text-xs text-slate-500">Invoice gross revenue vs sum of line items (qty * rate)</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${reconciliation.length === 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {reconciliation.length === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {reconciliation.length === 0
                  ? "All Invoices Fully Reconciled"
                  : `${reconciliation.length} Invoices Flagged with Discrepancies`}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {reconciledCount} of {totalInvoices} invoices match their computed line totals within tolerance (1% / ₦100).
              </p>
            </div>
          </div>

          {reconciliation.length > 0 && (
            <div className="border-t border-slate-100 pt-3 divide-y divide-slate-100">
              {reconciliation.map((rec, idx) => (
                <div key={idx} className="py-2 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Inv #{rec.invoice_no} ({rec.customer})</span>
                    <div className="text-[11px] text-slate-500">
                      Invoice Gross: {formatCurrency(rec.gross_revenue, currency)} vs Lines: {formatCurrency(rec.computed_line_revenue, currency)}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-700">
                    Diff: {formatCurrency(rec.diff, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Price-Matching Quality */}
      {matchQuality && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Price-List Match Quality</h2>
            <p className="text-xs text-slate-500">Confidence breakdown across {matchQuality.total_products} unique products</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5">
            {/* Counts grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <span className="text-lg font-bold text-emerald-800 block">{matchQuality.counts.exact}</span>
                <span className="text-[10px] text-emerald-700 font-semibold uppercase">Exact Matches</span>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-lg font-bold text-blue-800 block">{matchQuality.counts.fuzzy}</span>
                <span className="text-[10px] text-blue-700 font-semibold uppercase">Fuzzy (Pack Size)</span>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-lg">
                <span className="text-lg font-bold text-purple-800 block">{matchQuality.counts.manual_override}</span>
                <span className="text-[10px] text-purple-700 font-semibold uppercase">Manual Overrides</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-lg font-bold text-amber-800 block">{matchQuality.counts.unmatched}</span>
                <span className="text-[10px] text-amber-700 font-semibold uppercase">Unmatched</span>
              </div>
            </div>

            {/* Unmatched list */}
            {matchQuality.unmatched_products && matchQuality.unmatched_products.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Unmatched / Needs Human Decision:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchQuality.unmatched_products.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200/80"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Spreadsheet Anomalies Log */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Spreadsheet Parsing Anomalies</h2>
          <p className="text-xs text-slate-500">Corrupted rows and formula bugs safely isolated</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {anomalies.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No corrupted rows or spreadsheet anomalies found.
            </div>
          ) : (
            anomalies.map((item, idx) => (
              <div key={idx} className="p-3 text-xs space-y-1 hover:bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Sheet: {item.source_tab || "Raw Sheet"} {item.row ? `• Row ${item.row}` : ""}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                    Isolated
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {item.reason}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
