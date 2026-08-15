"use client";

import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  ShieldAlert,
  Package,
  Users,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

export type TabType =
  | "overview"
  | "daily"
  | "weekly"
  | "pricing"
  | "products"
  | "customers"
  | "returns"
  | "quality"
  | "settings";

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pricingLeakCount?: number;
  dominantProductCount?: number;
  lossCustomerCount?: number;
  anomalyCount?: number;
  returnsCount?: number;
}

export function Navigation({
  activeTab,
  onTabChange,
  pricingLeakCount = 0,
  dominantProductCount = 0,
  lossCustomerCount = 0,
  anomalyCount = 0,
  returnsCount = 0,
}: NavigationProps) {
  const tabs: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "daily", label: "Daily", icon: CalendarDays },
    { id: "weekly", label: "Weekly", icon: CalendarRange },
    {
      id: "pricing",
      label: "Pricing",
      icon: ShieldAlert,
      badge: pricingLeakCount > 0 ? pricingLeakCount : undefined,
      badgeColor: "bg-rose-600 text-white",
    },
    {
      id: "products",
      label: "Products",
      icon: Package,
      badge: dominantProductCount > 0 ? dominantProductCount : undefined,
      badgeColor: "bg-amber-500 text-white",
    },
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      badge: lossCustomerCount > 0 ? lossCustomerCount : undefined,
      badgeColor: "bg-rose-600 text-white",
    },
    {
      id: "returns",
      label: "Returns",
      icon: RotateCcw,
      badge: returnsCount > 0 ? returnsCount : undefined,
      badgeColor: "bg-[#7c6fff] text-white",
    },
    {
      id: "quality",
      label: "Quality",
      icon: CheckCircle2,
      badge: anomalyCount > 0 ? anomalyCount : undefined,
      badgeColor: "bg-amber-500 text-white",
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1 px-1 shadow-lg">
      <div className="mx-auto max-w-lg flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-lg transition-colors ${
                isActive
                  ? "text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-800 font-normal"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 transition-transform ${
                    isActive ? "stroke-[2.5px] scale-105 text-slate-900" : "stroke-[1.75px] text-slate-400"
                  }`}
                />
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2 text-[8px] font-extrabold px-1 py-0.2 rounded-full min-w-3 text-center ${
                      tab.badgeColor || "bg-rose-600 text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] mt-0.5 tracking-tight ${isActive ? "text-slate-900 font-bold" : "text-slate-500"}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-5 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
