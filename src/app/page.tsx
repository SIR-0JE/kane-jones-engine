"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation, TabType } from "@/components/Navigation";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { HomeScreen } from "@/components/HomeScreen";
import { UploadModal } from "@/components/UploadModal";
import { OverviewScreen } from "@/components/screens/OverviewScreen";
import { DailyScreen } from "@/components/screens/DailyScreen";
import { WeeklyScreen } from "@/components/screens/WeeklyScreen";
import { PricingAuditScreen } from "@/components/screens/PricingAuditScreen";
import { ProductsScreen } from "@/components/screens/ProductsScreen";
import { CustomersScreen } from "@/components/screens/CustomersScreen";
import { DataQualityScreen } from "@/components/screens/DataQualityScreen";
import { AnalyzeResponse, SnapshotSummary } from "@/types/api";
import { fetchSnapshots, fetchSnapshot } from "@/lib/api";
import { CANONICAL_JULY_SNAPSHOT } from "@/data/canonicalSnapshot";
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

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
  const [data, setData] = useState<AnalyzeResponse>(CANONICAL_JULY_SNAPSHOT);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [loadingSnapshots, setLoadingSnapshots] = useState<boolean>(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // 1. Fetch available snapshots on initial load
  useEffect(() => {
    async function loadSnapshotsList() {
      try {
        setLoadingSnapshots(true);
        const res = await fetchSnapshots("kane-jones");
        if (res && res.snapshots && res.snapshots.length > 0) {
          setSnapshots(res.snapshots);
          setSelectedPeriod(res.snapshots[0].period_label);
        }
      } catch (err) {
        console.warn("Using built-in snapshots list:", err);
      } finally {
        setLoadingSnapshots(false);
      }
    }
    loadSnapshotsList();
  }, []);

  // 2. Load snapshot data when entering workspace or switching period
  const handleSelectPeriod = async (periodLabel: string) => {
    setSelectedPeriod(periodLabel);
    setViewMode("workspace");
    setActiveTab("overview");
    setWorkspaceError(null);

    // Instant fallback for canonical July snapshot
    if (periodLabel === "2026-07") {
      setData(CANONICAL_JULY_SNAPSHOT);
    }

    try {
      setLoadingWorkspace(true);
      const snapshotData = await fetchSnapshot(periodLabel, "kane-jones");
      if (snapshotData && snapshotData.meta) {
        setData(snapshotData);
      }
    } catch (err: any) {
      console.warn(`Snapshot fetch fallback for ${periodLabel}:`, err);
      if (periodLabel === "2026-07") {
        setData(CANONICAL_JULY_SNAPSHOT);
      } else {
        setWorkspaceError(err?.message || `Could not load audit data for ${periodLabel}`);
      }
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
    <main className="w-full min-h-screen bg-slate-50/50 flex flex-col justify-between">
      {/* VIEW 1: HOME PAGE / AUDITS HUB */}
      {viewMode === "home" ? (
        <div className="w-full flex-1">
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
        <div className="flex flex-1 min-h-screen w-full">
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

          {/* Right Main Content Panel (Full bleed responsive) */}
          <div className="flex-1 flex flex-col min-w-0 w-full">
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
            <div className="flex-1 w-full">
              {workspaceError ? (
                <div className="p-8 max-w-md mx-auto text-center space-y-4 pt-20">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Unable to load audit data</h3>
                    <p className="text-xs text-slate-500 mt-1">{workspaceError}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setViewMode("home")}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Back to Hub
                    </button>
                    <button
                      onClick={() => handleSelectPeriod(selectedPeriod)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === "overview" && (
                    <OverviewScreen
                      data={data}
                      onNavigate={(tab) => setActiveTab(tab)}
                    />
                  )}
                  {activeTab === "daily" && <DailyScreen data={data} />}
                  {activeTab === "weekly" && <WeeklyScreen data={data} />}
                  {activeTab === "pricing" && <PricingAuditScreen data={data} />}
                  {activeTab === "products" && <ProductsScreen data={data} />}
                  {activeTab === "customers" && <CustomersScreen data={data} />}
                  {activeTab === "quality" && <DataQualityScreen data={data} />}
                </>
              )}
            </div>
          </div>

          {/* Mobile Bottom Fixed Navigation (< 768px) */}
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            pricingLeakCount={data.meta?.below_floor_items_count || data.below_floor_pricing?.length || 0}
            dominantProductCount={data.meta?.dominant_products_count || data.dominant_products?.length || 0}
            lossCustomerCount={data.meta?.loss_making_customers_count || data.loss_making_customers?.length || 0}
            anomalyCount={data.meta?.total_anomalies || data.anomalies?.length || 0}
          />
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
