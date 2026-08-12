"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Users,
  Package,
  FileText,
  HelpCircle,
  BarChart3,
  ChevronDown,
  Lock,
} from "lucide-react";
import { getCurrentSession, UserSession } from "@/lib/auth";

export default function LandingPage() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const current = getCurrentSession();
    setSession(current);
  }, []);

  const faqs = [
    {
      q: "What file format do I need to upload?",
      a: "The engine accepts standard Excel workbooks (.xlsx, .xlsm) containing daily sales report tabs and a master price list tab. It automatically recognizes standard FMCG distributor formats.",
    },
    {
      q: "Is my depot data isolated and private?",
      a: "Yes. Every registered depot manager operates in strict data isolation with dedicated audit storage and snapshots. Your sales data is never shared across depot accounts.",
    },
    {
      q: "What if my sales sheet layout varies slightly?",
      a: "The engine features intelligent fuzzy tab and column matching. It normalizes product names, sizes, and invoice line items automatically even if column headers vary slightly.",
    },
    {
      q: "How is the revenue leakage figure calculated?",
      a: "Leakage combines two components: (1) below-floor pricing (the exact naira gap between rate charged and distributor floor price), plus (2) volume-tier audit mis-pricing.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* 1. Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 lg:px-12 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-none">
                Kane-Jones
              </span>
              <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase block mt-0.5">
                Sales Intelligence Engine
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Auth CTA Buttons */}
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href="/app"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all active:scale-95"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-95"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-8 lg:px-12 bg-linear-to-b from-white to-slate-50 border-b border-slate-200/60 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>FMCG Depot Pricing & Revenue Leakage Audit</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Stop Revenue Leakage From Bad Pricing & Unearned Discounts
          </h1>

          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
            Automated monthly sales register auditing for FMCG depot managers. Instantly detect below-floor prices, quantity-tier errors, and loss-making customer accounts in seconds.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {session ? (
              <Link
                href="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md transition-all active:scale-98"
              >
                <span>Open {session.depotName} Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-extrabold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all active:scale-98"
                >
                  <span>Start Auditing Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-xs transition-all active:scale-98"
                >
                  <span>Log In to Account</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 3. Honest Stat Banner (No fake company logos!) */}
      <section className="py-12 bg-white border-b border-slate-200/80 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">₦180M+</div>
            <div className="text-xs font-semibold text-slate-500">Monthly Sales Audited</div>
          </div>
          <div className="p-4 space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-rose-700">735+</div>
            <div className="text-xs font-semibold text-slate-500">Line Items Verified Per Sheet</div>
          </div>
          <div className="p-4 space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">100%</div>
            <div className="text-xs font-semibold text-slate-500">Isolated Depot Data Privacy</div>
          </div>
          <div className="p-4 space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">PDF Report</div>
            <div className="text-xs font-semibold text-slate-500">Publication-Ready Exports</div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-8 lg:px-12 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              Simple 3-Step Process
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How the Depot Intelligence Engine Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              From raw Excel sales registers to verified pricing leakage numbers in under 10 seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-base">
                1
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Upload Sales Register</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload your raw monthly sales register (.xlsx) containing daily sales receipts and distributor price lists.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-extrabold flex items-center justify-center text-base">
                2
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Automated Audit Engine</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                The engine matches SKUs, checks floor prices, validates volume discount tiers, and reconciles invoice totals.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-base">
                3
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Dashboard & PDF Report</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Get immediate visual findings across pricing, customer accounts, and products, or download a clean executive PDF report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-8 lg:px-12 bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              Complete Feature Set
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Engineered for Depot Sales Precision
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Every audit capability built directly into the engine payload — zero guesswork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-300 transition-colors">
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl w-fit">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Below-Floor Pricing Detection</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Flags every invoice line item charged below distributor floor prices and computes the exact recoverable revenue opportunity.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-300 transition-colors">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl w-fit">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Volume-Tier Pricing Audit</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Audits every line item against volume discount tiers (Tier 1 vs Tier 2) to detect unearned price breaks or underpricing.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-300 transition-colors">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl w-fit">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Customer Margin & Loss Accounts</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ranks all customer accounts by revenue and gross margin %, automatically isolating negative-margin accounts draining depot profits.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-300 transition-colors">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl w-fit">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Product Concentration Risk</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ranks all product SKUs and flags concentration risks where a single product generates ≥20% of total depot revenue.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-300 transition-colors">
              <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl w-fit">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Data Integrity & Reconciliation</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Audits missing daily tabs, header anomalies, and variances between summary invoice totals and computed line items.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-300 transition-colors">
              <div className="p-2.5 bg-slate-200 text-slate-800 rounded-xl w-fit">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Publication PDF Reports</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generates un-capped, publication-ready PDF reports directly from stored audit payloads for management and board presentation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing Section ("Coming Soon / Contact Us") */}
      <section id="pricing" className="py-20 px-4 sm:px-8 lg:px-12 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto space-y-8 text-center">
          <div className="space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              Depot Onboarding
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Flexible Setup for Single & Multi-Depot Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              We are onboarding FMCG beverage depot operations with tailored client price profiles and data isolation.
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-md max-w-xl mx-auto space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Depot Intelligence Account</h3>
                <p className="text-xs text-slate-500">Dedicated manager portal & audit storage</p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                Early Access
              </span>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited monthly sales register uploads</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Automated floor pricing & volume tier verification</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Customer margin & loss account breakdown</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Un-capped PDF report exports</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Isolated depot data storage</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/signup"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
              >
                <span>Create Depot Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-8 lg:px-12 bg-white border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-extrabold text-xs sm:text-sm text-slate-900"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-slate-900" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 mt-1">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Footer + Closing CTA */}
      <footer className="bg-slate-900 text-white pt-16 pb-12 px-4 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="p-8 sm:p-12 bg-slate-800/80 rounded-3xl border border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-xl sm:text-2xl font-black">Ready to Audit Your Depot Sales?</h3>
              <p className="text-xs text-slate-400">
                Set up your account in seconds and stop pricing leakage today.
              </p>
            </div>
            <Link
              href="/signup"
              className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl shadow-md transition-all shrink-0 active:scale-95 flex items-center gap-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-slate-300">Kane-Jones Sales Intelligence Engine</span>
            </div>
            <div>© {new Date().getFullYear()} All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
