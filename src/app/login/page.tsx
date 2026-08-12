"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Lock, Mail, ShieldAlert, Loader2 } from "lucide-react";
import { loginUser, getCurrentSession, DEMO_USER } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(true);
    setError(null);

    try {
      await loginUser({ email, password });
      router.push("/app");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEMO_USER.email);
    setPassword("KaneJones@2026");
    setError(null);
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
          href="/signup"
          className="text-xs font-bold text-slate-700 hover:text-slate-900 underline-offset-4 hover:underline"
        >
          Need an account? Sign up
        </Link>
      </header>

      {/* Main Login Form Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign in to your Depot
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Access your sales audit dashboard, leakage analysis & reports
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
                Manager Email
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Testing as Kane-Jones Depot?</span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                Use Demo Login
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} Kane-Jones Sales Intelligence Engine. All rights reserved.
      </footer>
    </div>
  );
}
