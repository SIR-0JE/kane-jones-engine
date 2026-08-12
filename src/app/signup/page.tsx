"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Lock, Mail, ShieldAlert, Loader2, Sparkles } from "lucide-react";
import { signupUser, getCurrentSession } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [depotName, setDepotName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      router.push("/app");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signupUser({ email, password, depotName });
      router.push("/app");
    } catch (err: any) {
      setError(err?.message || "Failed to create depot account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header Navigation */}
      <header className="w-full bg-white border-b border-slate-200 py-4 px-6 sm:px-12 flex items-center justify-between">
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
        <Link
          href="/login"
          className="text-xs font-bold text-slate-700 hover:text-slate-900 underline-offset-4 hover:underline"
        >
          Already have an account? Log in
        </Link>
      </header>

      {/* Main Signup Form Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 mb-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Start Auditing Your Depot Sales</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Create your Depot Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Set up dedicated data isolation and audit registers for your FMCG depot
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Depot / Company Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Lagos Central Depot"
                  value={depotName}
                  onChange={(e) => setDepotName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-hidden transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                This name seeds your depot&apos;s workspace and metadata.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Manager Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="manager@depot.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Depot Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-center text-slate-400">
            By signing up, you agree to secure data isolation for your depot register uploads.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} Kane-Jones Sales Intelligence Engine. All rights reserved.
      </footer>
    </div>
  );
}
