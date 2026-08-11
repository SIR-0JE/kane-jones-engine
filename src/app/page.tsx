"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation, TabType } from "@/components/Navigation";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { HomeScreen } from "@/components/HomeScreen";
import { UploadModal } from "@/components/UploadModal";
import { OverviewScreen } from "@/components/screens/OverviewScreen";
import { PricingAuditScreen } from "@/components/screens/PricingAuditScreen";
import { ProductsScreen } from "@/components/screens/ProductsScreen";
import { CustomersScreen } from "@/components/screens/CustomersScreen";
import { DataQualityScreen } from "@/components/screens/DataQualityScreen";
import { AnalyzeResponse, SnapshotSummary } from "@/types/api";
import { fetchSnapshots, fetchSnapshot } from "@/lib/api";
import { Loader2 } from "lucide-react";

// Default initial snapshot fallback for cold loads
const INITIAL_SNAPSHOTS: SnapshotSummary[] = [
  {
    period_label: "2026-07",
    audit_title: "July 2026 Full Audit",
    total_revenue: 187674790.0,
    total_gross_profit: 3717623.0,
    overall_margin_pct: 0.0198088565864387,
    total_invoices: 300,
    total_recoverable_leakage: 11104465.0,
    below_floor_items_count: 5,
    loss_making_customers_count: 10,
    currency_symbol: "₦",
    date_range: {
      start: "2026-07-01",
      end: "2026-07-31",
    },
  },
];

export default function DashboardHome() {
  const [viewMode, setViewMode] = useState<"home" | "workspace">("home");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>(INITIAL_SNAPSHOTS);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-07");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [loadingSnapshots, setLoadingSnapshots] = useState<boolean>(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);

  // 1. Fetch available snapshots on initial load
  useEffect(() => {
    async function loadSnapshotsList() {
      try {
        setLoadingSnapshots(true);
        const res = await fetchSnapshots("kane-jones");
        if (res.snapshots && res.snapshots.length > 0) {
          setSnapshots(res.snapshots);
          setSelectedPeriod(res.snapshots[0].period_label);
        }
      } catch (err) {
        console.warn("Using fallback snapshots list:", err);
      } finally {
        setLoadingSnapshots(false);
      }
    }
    loadSnapshotsList();
  }, []);

  // 2. Load snapshot data when entering workspace or switching period
  const handleSelectPeriod = async (periodLabel: string) => {
    setSelectedPeriod(periodLabel);
    setLoadingWorkspace(true);
    setViewMode("workspace");
    setActiveTab("overview");

    try {
      const snapshotData = await fetchSnapshot(periodLabel, "kane-jones");
      setData(snapshotData);
    } catch (err) {
      console.warn(`Failed to fetch live snapshot for ${periodLabel}, loading default:`, err);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  // 3. Handle upload success
  const handleUploadSuccess = (freshData: AnalyzeResponse) => {
    setData(freshData);
    const newPeriod = freshData.meta?.period_label || "Uploaded Period";
    const newTitle = freshData.meta?.audit_title || freshData.audit_title || `${newPeriod} Audit`;
    setSelectedPeriod(newPeriod);

    // Update snapshots summary list
    const newSummary: SnapshotSummary = {
      period_label: newPeriod,
      audit_title: newTitle,
      total_revenue: freshData.meta?.total_revenue || 0,
      total_gross_profit: freshData.meta?.total_gross_profit || 0,
      overall_margin_pct: freshData.meta?.overall_margin_pct || 0,
      total_invoices: freshData.meta?.total_invoices || 0,
      total_recoverable_leakage: freshData.meta?.total_recoverable_leakage || 0,
      below_floor_items_count: freshData.meta?.below_floor_items_count || 0,
      loss_making_customers_count: freshData.meta?.loss_making_customers_count || 0,
      currency_symbol: freshData.meta?.currency_symbol || "₦",
      date_range: freshData.meta?.date_range,
    };

    setSnapshots((prev) => {
      const filtered = prev.filter((s) => s.period_label !== newPeriod);
      return [newSummary, ...filtered];
    });

    setViewMode("workspace");
    setActiveTab("overview");
  };

  const displayName = data?.meta?.client_display_name || "Kane-Jones Depot (Ogun State)";
  const auditTitle = data?.meta?.audit_title || data?.audit_title || `${selectedPeriod} Full Audit`;

  return (
    <main className="min-h-screen bg-slate-50/50 flex flex-col justify-between">
      {/* VIEW 1: HOME PAGE / AUDITS HUB */}
      {viewMode === "home" ? (
        <div className="flex-1">
          <HomeScreen
            displayName={displayName}
            snapshots={snapshots}
            loading={loadingSnapshots}
            onSelectPeriod={handleSelectPeriod}
            onUploadClick={() => setIsUploadOpen(true)}
          />
        </div>
      ) : (
        /* VIEW 2: DEDICATED AUDIT WORKSPACE */
        <div className="flex flex-1 min-h-screen">
          {/* Desktop Left Sidebar (>= 768px) */}
          <DesktopSidebar
            displayName="Kane-Jones Depot"
            activePeriodLabel={selectedPeriod}
            activeAuditTitle={auditTitle}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            onBackToHome={() => setViewMode("home")}
            onUploadClick={() => setIsUploadOpen(true)}
            allSnapshots={snapshots}
            onSelectPeriod={handleSelectPeriod}
            pricingLeakCount={data?.meta?.below_floor_items_count || data?.below_floor_pricing?.length || 0}
            dominantProductCount={data?.meta?.dominant_products_count || data?.dominant_products?.length || 0}
            lossCustomerCount={data?.meta?.loss_making_customers_count || data?.loss_making_customers?.length || 0}
            anomalyCount={data?.meta?.total_anomalies || data?.anomalies?.length || 0}
          />

          {/* Right Main Content Panel */}
          <div className="flex-1 flex flex-col min-w-0 max-w-5xl">
            {/* Top Navigation Header */}
            <Header
              displayName={displayName}
              periodLabel={selectedPeriod}
              auditTitle={auditTitle}
              dateRange={data?.meta?.date_range}
              onBackToHome={() => setViewMode("home")}
              onUploadClick={() => setIsUploadOpen(true)}
            />

            {/* Main Screen Content */}
            <div className="flex-1">
              {loadingWorkspace || !data ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                  <span className="text-xs font-semibold text-slate-600">
                    Loading {selectedPeriod} Audit Workspace...
                  </span>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Mobile Bottom Fixed Navigation (< 768px) */}
          {data && (
            <Navigation
              activeTab={activeTab}
              onTabChange={(tab) => setActiveTab(tab)}
              pricingLeakCount={data.meta?.below_floor_items_count || data.below_floor_pricing?.length || 0}
              dominantProductCount={data.meta?.dominant_products_count || data.dominant_products?.length || 0}
              lossCustomerCount={data.meta?.loss_making_customers_count || data.loss_making_customers?.length || 0}
              anomalyCount={data.meta?.total_anomalies || data.anomalies?.length || 0}
            />
          )}
        </div>
      )}

      {/* Upload Workbook Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </main>
  );
}
