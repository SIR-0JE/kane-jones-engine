"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation, TabType } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { OverviewScreen } from "@/components/screens/OverviewScreen";
import { PricingAuditScreen } from "@/components/screens/PricingAuditScreen";
import { ProductsScreen } from "@/components/screens/ProductsScreen";
import { CustomersScreen } from "@/components/screens/CustomersScreen";
import { DataQualityScreen } from "@/components/screens/DataQualityScreen";
import { AnalyzeResponse } from "@/types/api";

// Built-in initial snapshot data for Kane-Jones July sales audit
const INITIAL_DATA: AnalyzeResponse = {
  meta: {
    client_id: "kane-jones",
    client_display_name: "Kane-Jones Depot (Ogun State)",
    period_label: "2026-07",
    currency_symbol: "₦",
    total_revenue: 187674790.0,
    total_gross_profit: 3717623.0,
    overall_margin_pct: 0.0198088565864387,
    date_range: {
      start: "2026-07-01",
      end: "2026-07-31",
    },
    total_invoices: 300,
    total_anomalies: 3,
    reconciliation_discrepancies_count: 0,
    loss_making_invoices_count: 68,
    loss_making_customers_count: 10,
    dominant_products_count: 1,
  },
  match_quality: {
    total_products: 45,
    counts: {
      exact: 9,
      fuzzy: 22,
      manual_override: 5,
      fuzzy_no_size_match: 0,
      unmatched: 9,
    },
    unmatched_products: [
      "Trophy",
      "NB Empties",
      "IB Empties",
      "GNS EMPTIES",
      "4th Street wine",
      "ACE BITTERS",
      "STK 33cl",
      "Empties Premium",
      "NB Loose Crate",
    ],
  },
  anomalies: [
    {
      row: 216,
      source_tab: "tmpA1A6",
      reason: "Non-blank row mid-item-block with no product name (likely a stray subtotal/formula-bug row) — treated as end of block.",
    },
    {
      row: 147,
      source_tab: "tmp32C7",
      reason: "Non-blank row mid-item-block with no product name (likely a stray subtotal/formula-bug row) — treated as end of block.",
    },
    {
      row: 388,
      source_tab: "tmp32C7",
      reason: "Non-blank row mid-item-block with no product name (likely a stray subtotal/formula-bug row) — treated as end of block.",
    },
  ],
  reconciliation_discrepancies: [],
  loss_making_invoices: [
    {
      invoice_no: "ann-INV260",
      source_tab: "tmpA1A6",
      date: "2026-07-16",
      customer: "FINO STORES",
      gross_revenue: 6138000.0,
      invoice_cost: 6448000.0,
      gross_profit: -310000.0,
    },
    {
      invoice_no: "ann-INV422",
      source_tab: "tmp32C7",
      date: "2026-07-30",
      customer: "FINO STORES",
      gross_revenue: 6138000.0,
      invoice_cost: 6448000.0,
      gross_profit: -310000.0,
    },
    {
      invoice_no: "ann-INV350",
      source_tab: "tmp32C7",
      date: "2026-07-23",
      customer: "Rita SR",
      gross_revenue: 2480000.0,
      invoice_cost: 2579200.0,
      gross_profit: -99200.0,
    },
  ],
  loss_making_customers: [
    {
      customer: "FINO STORES",
      invoices: 2,
      revenue: 12276000.0,
      cost: 12896000.0,
      gross_profit: -620000.0,
      margin_pct: -0.050505,
      pct_of_total_revenue: 0.065411,
      is_loss_making: true,
    },
    {
      customer: "Eniola Marketer",
      invoices: 31,
      revenue: 24198115.0,
      cost: 24565107.0,
      gross_profit: -366992.0,
      margin_pct: -0.015166,
      pct_of_total_revenue: 0.128936,
      is_loss_making: true,
    },
    {
      customer: "AZ Marketer",
      invoices: 3,
      revenue: 3642500.0,
      cost: 3755050.0,
      gross_profit: -112550.0,
      margin_pct: -0.030899,
      pct_of_total_revenue: 0.019409,
      is_loss_making: true,
    },
    {
      customer: "Rita SR",
      invoices: 25,
      revenue: 20732840.0,
      cost: 20829470.0,
      gross_profit: -96630.0,
      margin_pct: -0.004661,
      pct_of_total_revenue: 0.110472,
      is_loss_making: true,
    },
    {
      customer: "Demola SR",
      invoices: 2,
      revenue: 2725500.0,
      cost: 2775520.0,
      gross_profit: -50020.0,
      margin_pct: -0.018353,
      pct_of_total_revenue: 0.014522,
      is_loss_making: true,
    },
    {
      customer: "Jeff SR",
      invoices: 11,
      revenue: 2449195.0,
      cost: 2498835.0,
      gross_profit: -49640.0,
      margin_pct: -0.020268,
      pct_of_total_revenue: 0.01305,
      is_loss_making: true,
    },
    {
      customer: "Mr Lekan Ojifini",
      invoices: 7,
      revenue: 4393180.0,
      cost: 4437716.0,
      gross_profit: -44536.0,
      margin_pct: -0.010138,
      pct_of_total_revenue: 0.023408,
      is_loss_making: true,
    },
    {
      customer: "Stella SR",
      invoices: 3,
      revenue: 880000.0,
      cost: 894085.0,
      gross_profit: -14085.0,
      margin_pct: -0.016006,
      pct_of_total_revenue: 0.004689,
      is_loss_making: true,
    },
    {
      customer: "DESOLA STORE",
      invoices: 1,
      revenue: 612000.0,
      cost: 624000.0,
      gross_profit: -12000.0,
      margin_pct: -0.019608,
      pct_of_total_revenue: 0.003261,
      is_loss_making: true,
    },
    {
      customer: "TD Odiolowo",
      invoices: 6,
      revenue: 566700.0,
      cost: 568834.0,
      gross_profit: -2134.0,
      margin_pct: -0.003766,
      pct_of_total_revenue: 0.00302,
      is_loss_making: true,
    },
  ],
  dominant_products: [
    {
      product_raw: "Maltina Pet 33cl",
      cases_sold: 10236.0,
      revenue: 51082710.0,
      pct_of_total: 0.292955,
      is_dominant: true,
    },
  ],
  below_floor_pricing: [
    {
      product_raw: "Goldberg 60cl",
      cases_sold: 1550.0,
      avg_rate_charged: 8867.2,
      distributor_price: 8990.0,
      gap_pct: -0.01366,
      revenue_opportunity: 190340.0,
    },
    {
      product_raw: "Heineken Sleek Can",
      cases_sold: 800.0,
      avg_rate_charged: 18125.0,
      distributor_price: 18900.0,
      gap_pct: -0.041005,
      revenue_opportunity: 620000.0,
    },
    {
      product_raw: "Maltina Can 33cl",
      cases_sold: 1400.0,
      avg_rate_charged: 9400.0,
      distributor_price: 9800.0,
      gap_pct: -0.040816,
      revenue_opportunity: 560000.0,
    },
    {
      product_raw: "Legend Can 44cl",
      cases_sold: 450.0,
      avg_rate_charged: 15200.0,
      distributor_price: 16100.0,
      gap_pct: -0.055901,
      revenue_opportunity: 405000.0,
    },
  ],
  volume_tier_audit: [
    {
      invoice_no: "ann-INV142",
      customer: "Rita SR",
      product_raw: "Maltina Pet 33cl",
      quantity: 50,
      rate: 4950.0,
      expected_tier: "sub_distributor",
      expected_price: 5100.0,
      price_diff: -150.0,
      price_diff_pct: -0.029412,
      audit_result: "underpriced",
      revenue_impact: -7500.0,
    },
    {
      invoice_no: "ann-INV143",
      customer: "Delayers",
      product_raw: "Goldberg 60cl",
      quantity: 120,
      rate: 8850.0,
      expected_tier: "sub_distributor",
      expected_price: 9050.0,
      price_diff: -200.0,
      price_diff_pct: -0.022099,
      audit_result: "underpriced",
      revenue_impact: -24000.0,
    },
    {
      invoice_no: "ann-INV144",
      customer: "AZ Marketer",
      product_raw: "Heineken Bottle 60cl",
      quantity: 350,
      rate: 13500.0,
      expected_tier: "distributor",
      expected_price: 13500.0,
      price_diff: 0.0,
      price_diff_pct: 0.0,
      audit_result: "correct",
      revenue_impact: 0.0,
    },
  ],
  daily_summary: [
    { date_only: "2026-07-01", revenue: 1557600.0, gross_profit: -43362.0, invoices: 3, margin_pct: -0.027839 },
    { date_only: "2026-07-02", revenue: 4267435.0, gross_profit: -30444.0, invoices: 14, margin_pct: -0.007134 },
    { date_only: "2026-07-03", revenue: 16681745.0, gross_profit: 232432.0, invoices: 13, margin_pct: 0.013933 },
    { date_only: "2026-07-04", revenue: 7874270.0, gross_profit: -30110.0, invoices: 9, margin_pct: -0.003824 },
    { date_only: "2026-07-06", revenue: 7250945.0, gross_profit: 62475.0, invoices: 13, margin_pct: 0.008616 },
  ],
  weekly_summary: [
    { week: 1, revenue: 53289910.0, gross_profit: 416641.0, invoices: 66, margin_pct: 0.007818 },
    { week: 2, revenue: 36591735.0, gross_profit: 1123305.0, invoices: 69, margin_pct: 0.030698 },
    { week: 3, revenue: 42618090.0, gross_profit: 1644148.0, invoices: 62, margin_pct: 0.038579 },
    { week: 4, revenue: 35520725.0, gross_profit: 739086.0, invoices: 79, margin_pct: 0.020807 },
    { week: 5, revenue: 19654330.0, gross_profit: -205557.0, invoices: 24, margin_pct: -0.010459 },
  ],
  product_revenue_ranking: [
    { product_raw: "Maltina Pet 33cl", cases_sold: 10236.0, revenue: 51082710.0, pct_of_total: 0.292955, is_dominant: true },
    { product_raw: "Goldberg 60cl", cases_sold: 2645.0, revenue: 23455120.0, pct_of_total: 0.13451 },
    { product_raw: "Heineken Bottle 60cl", cases_sold: 1520.0, revenue: 20520000.0, pct_of_total: 0.11767 },
    { product_raw: "33 Export 60cl", cases_sold: 1810.0, revenue: 16290000.0, pct_of_total: 0.09342 },
    { product_raw: "Heineken Sleek Can", cases_sold: 800.0, revenue: 14500000.0, pct_of_total: 0.08315 },
    { product_raw: "Maltina Can 33cl", cases_sold: 1400.0, revenue: 13160000.0, pct_of_total: 0.07547 },
    { product_raw: "Legend Can 44cl", cases_sold: 720.0, revenue: 10944000.0, pct_of_total: 0.06276 },
    { product_raw: "Turbo King Bottle 60cl", cases_sold: 750.0, revenue: 7500000.0, pct_of_total: 0.04301 },
    { product_raw: "Amstel Malta Bottle 33cl", cases_sold: 680.0, revenue: 6460000.0, pct_of_total: 0.03705 },
    { product_raw: "Gulder Bottle", cases_sold: 520.0, revenue: 5200000.0, pct_of_total: 0.02982 },
  ],
  customer_margin_detail: [
    { customer: "Eniola Marketer", invoices: 31, revenue: 24198115.0, cost: 24565107.0, gross_profit: -366992.0, margin_pct: -0.015166, pct_of_total_revenue: 0.128936, is_loss_making: true },
    { customer: "Rita SR", invoices: 25, revenue: 20732840.0, cost: 20829470.0, gross_profit: -96630.0, margin_pct: -0.004661, pct_of_total_revenue: 0.110472, is_loss_making: true },
    { customer: "Delayers", invoices: 19, revenue: 18450120.0, cost: 17890200.0, gross_profit: 559920.0, margin_pct: 0.030348, pct_of_total_revenue: 0.098309, is_loss_making: false },
    { customer: "FINO STORES", invoices: 2, revenue: 12276000.0, cost: 12896000.0, gross_profit: -620000.0, margin_pct: -0.050505, pct_of_total_revenue: 0.065411, is_loss_making: true },
    { customer: "Ameh Mathew", invoices: 16, revenue: 9840250.0, cost: 9340000.0, gross_profit: 500250.0, margin_pct: 0.050837, pct_of_total_revenue: 0.052432, is_loss_making: false },
  ],
  concentration_metrics: {
    top_n: 10,
    top_n_revenue: 76671745.0,
    total_revenue: 88357590.0,
    top_n_pct: 0.867743733164293,
  },
};

export default function DashboardHome() {
  const [data, setData] = useState<AnalyzeResponse>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  return (
    <main className="min-h-screen flex flex-col justify-between">
      <div>
        {/* Sticky Header */}
        <Header
          displayName={data.meta?.client_display_name || "Kane-Jones Depot"}
          periodLabel={data.meta?.period_label || "2026-07"}
          dateRange={data.meta?.date_range}
          onUploadClick={() => setIsUploadOpen(true)}
        />

        {/* Tab Screens */}
        {activeTab === "overview" && (
          <OverviewScreen
            data={data}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === "pricing" && <PricingAuditScreen data={data} />}
        {activeTab === "products" && <ProductsScreen data={data} />}
        {activeTab === "customers" && <CustomersScreen data={data} />}
        {activeTab === "quality" && <DataQualityScreen data={data} />}
      </div>

      {/* Upload Workbook Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(freshData) => {
          setData(freshData);
          setActiveTab("overview");
        }}
      />

      {/* Bottom Fixed Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        pricingLeakCount={data.below_floor_pricing?.length || 0}
        anomalyCount={data.anomalies?.length || 0}
      />
    </main>
  );
}
