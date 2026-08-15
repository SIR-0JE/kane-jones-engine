"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { Navigation } from "@/components/Navigation";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { getCurrentSession, logoutUser, UserSession } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const current = getCurrentSession();
    if (!current) {
      router.push("/login");
      return;
    }
    setSession(current);
    setAuthChecked(true);
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  const handleProfileUpdated = (updatedSession: UserSession) => {
    setSession(updatedSession);
  };

  if (!authChecked || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const displayName = session.depotName || "Depot Workspace";

  return (
    <main className="w-full min-h-screen bg-slate-50/50 flex flex-col justify-between">
      <div className="flex flex-1 min-h-screen w-full">
        {/* Desktop & Mobile Left Sidebar */}
        <DesktopSidebar
          displayName={displayName}
          activePeriodLabel="Settings"
          activeAuditTitle="Account Settings"
          activeTab="settings"
          onTabChange={(tab) => {
            if (tab === "settings") return;
            router.push("/app");
          }}
          onBackToHome={() => router.push("/app")}
          onUploadClick={() => router.push("/app")}
          onLogout={handleLogout}
          onOpenSettings={() => {}}
          userSession={session}
          pricingLeakCount={0}
          dominantProductCount={0}
          lossCustomerCount={0}
          anomalyCount={0}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Right Main Content Panel */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <Header
            displayName={displayName}
            periodLabel="Settings"
            auditTitle="Account & Depot Settings"
            userSession={session}
            onBackToHome={() => router.push("/app")}
            onUploadClick={() => router.push("/app")}
            onOpenSettings={() => {}}
            onLogout={handleLogout}
            onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          />

          <div className="flex-1 w-full bg-white overflow-x-hidden">
            <SettingsScreen onProfileUpdated={handleProfileUpdated} />
          </div>
        </div>
      </div>
    </main>
  );
}
