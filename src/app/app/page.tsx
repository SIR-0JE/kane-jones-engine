"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ReturnsScreen } from "@/components/screens/ReturnsScreen";
import { DataQualityScreen } from "@/components/screens/DataQualityScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { AnalyzeResponse, SnapshotSummary } from "@/types/api";
import { fetchSnapshots, fetchSnapshot } from "@/lib/api";
import { CANONICAL_JULY_SNAPSHOT } from "@/data/canonicalSnapshot";
import { checkDepotStatus, getCurrentSession, logoutUser, recreateDepot, UserSession } from "@/lib/auth";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

export default function AppDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<"home" | "workspace">("home");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [loadingSnapshots, setLoadingSnapshots] = useState<boolean>(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [depotMissing, setDepotMissing] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // 1. Auth Guard
  useEffect(() => {
    const current = getCurrentSession();
    if (!current) {
      router.push("/login");
      return;
    }
    setSession(current);
    setAuthChecked(true);

    const handleAuthChange = () => {
      setSession(getCurrentSession());
    };
    window.addEventListener("kj_auth_changed", handleAuthChange);
    return () => window.removeEventListener("kj_auth_changed", handleAuthChange);
  }, [router]);

  // 2. Fetch snapshots for active depot account & verify depot record
  useEffect(() => {
    if (!session) return;

    async function loadDepotSnapshots() {
      setLoadingSnapshots(true);
      try {
        // Check if depot row exists in Supabase
        const status = await checkDepotStatus(session!.clientId);
        if (status && status.exists === false) {
          setDepotMissing(true);
          setSnapshots([]);
          return;
        } else {
          setDepotMissing(false);
        }

        const res = await fetchSnapshots(session!.clientId);
        if (res && res.snapshots && res.snapshots.length > 0) {
          setSnapshots(res.snapshots);
          setSelectedPeriod(res.snapshots[0].period_label);
        } else if (session!.clientId === "kane-jones") {
          // Fallback for default demo depot account
          setSnapshots([
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
              date_range: { start: "2026-07-01", end: "2026-07-31" },
            },
          ]);
          setSelectedPeriod("2026-07");
          setData(CANONICAL_JULY_SNAPSHOT);
        } else {
          // Brand new manager account: empty snapshots list
          setSnapshots([]);
        }
      } catch (err) {
        console.warn("Snapshots list load exception:", err);
        if (session!.clientId === "kane-jones") {
          setData(CANONICAL_JULY_SNAPSHOT);
        }
      } finally {
        setLoadingSnapshots(false);
      }
    }

    loadDepotSnapshots();
  }, [session]);

  const handleRecreateDepot = async (depotName: string) => {
    const updated = await recreateDepot(depotName);
    setSession(updated);
    setDepotMissing(false);
    const res = await fetchSnapshots(updated.clientId);
    if (res && res.snapshots) {
      setSnapshots(res.snapshots);
    }
  };

  // 3. Select audit period
  const handleSelectPeriod = async (periodLabel: string) => {
    if (!session) return;

    setSelectedPeriod(periodLabel);
    setViewMode("workspace");
    setActiveTab("overview");
    setWorkspaceError(null);

    if (session.clientId === "kane-jones" && periodLabel === "2026-07") {
      setData(CANONICAL_JULY_SNAPSHOT);
    }

    try {
      setLoadingWorkspace(true);
      const snapshotData = await fetchSnapshot(periodLabel, session.clientId);
      if (snapshotData && snapshotData.meta) {
        setData(snapshotData);
      }
    } catch (err: any) {
      console.warn(`Snapshot fetch fallback for ${periodLabel}:`, err);
      if (session.clientId === "kane-jones" && periodLabel === "2026-07") {
        setData(CANONICAL_JULY_SNAPSHOT);
      } else {
        setWorkspaceError(err?.message || `Could not load audit data for ${periodLabel}`);
      }
    } finally {
      setLoadingWorkspace(false);
    }
  };

  // 4. Upload success handler
  const handleUploadSuccess = (freshData: AnalyzeResponse) => {
    setData(freshData);
    const newPeriod = freshData.meta?.period_label || "Uploaded Period";
    const newTitle = freshData.meta?.audit_title || freshData.audit_title || `${newPeriod} Audit`;
    setSelectedPeriod(newPeriod);

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

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  if (!authChecked || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const displayName = session.depotName || "Depot Workspace";
  const auditTitle = data?.meta?.audit_title || data?.audit_title || `${selectedPeriod} Full Audit`;

  return (
    <main className="w-full min-h-screen bg-slate-50/50 flex flex-col justify-between">
      {/* VIEW 1: HOME PAGE / AUDITS HUB */}
      {viewMode === "home" ? (
        <div className="w-full flex-1 flex flex-col">
          <Header
            displayName={displayName}
            isHomeHub={true}
            userSession={session}
            onUploadClick={() => setIsUploadOpen(true)}
            onOpenSettings={() => {
              setViewMode("workspace");
              setActiveTab("settings");
            }}
            onLogout={handleLogout}
          />
          <HomeScreen
            displayName={displayName}
            snapshots={snapshots}
            loading={loadingSnapshots}
            onSelectPeriod={handleSelectPeriod}
            onUploadClick={() => setIsUploadOpen(true)}
            depotMissing={depotMissing}
            onRecreateDepot={handleRecreateDepot}
          />
        </div>
      ) : (
        /* VIEW 2: DEDICATED AUDIT WORKSPACE */
        <div className="flex flex-1 min-h-screen w-full">
          {/* Desktop & Mobile Slide-Out Left Sidebar */}
          <DesktopSidebar
            displayName={displayName}
            activePeriodLabel={selectedPeriod}
            activeAuditTitle={auditTitle}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            onBackToHome={() => setViewMode("home")}
            onUploadClick={() => setIsUploadOpen(true)}
            onLogout={handleLogout}
            onOpenSettings={() => setActiveTab("settings")}
            userSession={session}
            allSnapshots={snapshots}
            onSelectPeriod={handleSelectPeriod}
            pricingLeakCount={data?.meta?.below_floor_items_count || data?.below_floor_pricing?.length || 0}
            dominantProductCount={data?.meta?.dominant_products_count || data?.dominant_products?.length || 0}
            lossCustomerCount={data?.meta?.loss_making_customers_count || data?.loss_making_customers?.length || 0}
            anomalyCount={data?.meta?.total_anomalies || data?.anomalies?.length || 0}
            returnsCount={data?.returns_analysis?.items_breakdown?.length || 0}
            isMobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          {/* Right Main Content Panel */}
          <div className="flex-1 flex flex-col min-w-0 w-full">
            <Header
              displayName={displayName}
              periodLabel={activeTab === "settings" ? "Settings" : selectedPeriod}
              auditTitle={activeTab === "settings" ? "Account Settings" : auditTitle}
              dateRange={data?.meta?.date_range}
              userSession={session}
              onBackToHome={() => setViewMode("home")}
              onUploadClick={() => setIsUploadOpen(true)}
              onOpenSettings={() => setActiveTab("settings")}
              onLogout={handleLogout}
              onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
            />

            {/* Screen Router */}
            <div className="flex-1 w-full bg-white overflow-x-hidden">
              {activeTab === "settings" ? (
                <SettingsScreen onProfileUpdated={(updated) => setSession(updated)} />
              ) : loadingWorkspace ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                  <p className="text-xs font-semibold text-slate-500">
                    Loading audit snapshot for {selectedPeriod}…
                  </p>
                </div>
              ) : workspaceError ? (
                <div className="p-8 max-w-lg mx-auto my-12 bg-rose-50 border border-rose-200 rounded-2xl space-y-4 text-center">
                  <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                  <h3 className="text-sm font-bold text-rose-900">Audit Data Unavailable</h3>
                  <p className="text-xs text-rose-700">{workspaceError}</p>
                  <button
                    onClick={() => setViewMode("home")}
                    className="px-4 py-2 bg-rose-900 text-white rounded-xl text-xs font-bold hover:bg-rose-800 transition-all inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Audits Hub</span>
                  </button>
                </div>
              ) : data ? (
                <>
                  {activeTab === "overview" && (
                    <OverviewScreen data={data} onNavigate={(tab) => setActiveTab(tab)} />
                  )}
                  {activeTab === "daily" && <DailyScreen data={data} />}
                  {activeTab === "weekly" && <WeeklyScreen data={data} />}
                  {activeTab === "pricing" && <PricingAuditScreen data={data} />}
                  {activeTab === "products" && <ProductsScreen data={data} />}
                  {activeTab === "customers" && <CustomersScreen data={data} />}
                  {activeTab === "returns" && <ReturnsScreen data={data} />}
                  {activeTab === "quality" && <DataQualityScreen data={data} />}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Shared Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
        clientId={session.clientId}
      />
    </main>
  );
}
