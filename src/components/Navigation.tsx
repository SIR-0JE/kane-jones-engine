"use client";

import React from "react";
import {
  LayoutDashboard,
  Tag,
  Package,
  Users,
  ShieldCheck,
} from "lucide-react";

export type TabType = "overview" | "pricing" | "products" | "customers" | "quality";

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pricingLeakCount?: number;
  anomalyCount?: number;
}

export function Navigation({
  activeTab,
  onTabChange,
  pricingLeakCount = 0,
  anomalyCount = 0,
}: NavigationProps) {
  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "pricing", label: "Pricing", icon: Tag, badge: pricingLeakCount > 0 ? pricingLeakCount : undefined },
    { id: "products", label: "Products", icon: Package },
    { id: "customers", label: "Customers", icon: Users },
    { id: "quality", label: "Quality", icon: ShieldCheck, badge: anomalyCount > 0 ? anomalyCount : undefined },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-2">
      <div className="mx-auto max-w-md md:max-w-4xl flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
                isActive
                  ? "text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-800 font-normal"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "stroke-[2.5px] scale-105 text-emerald-700" : "stroke-[1.75px]"
                  }`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 tracking-tight ${isActive ? "text-emerald-900 font-semibold" : "text-slate-500"}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-6 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
