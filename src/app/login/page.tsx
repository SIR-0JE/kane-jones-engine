"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentSession, loginUser, validateEmail, DEMO_USER } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Middleware/session check: if authenticated, redirect to /app
  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      router.push("/app");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      await loginUser({ email, password });
      router.push("/app");
    } catch (err: any) {
      setError(err?.message || "That email or password is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail(DEMO_USER.email);
    setPassword("KaneJones@2026");
    setError(null);
  };

  return (
    <div className="login-body min-h-screen w-full flex bg-white text-[#14162a] font-sans selection:bg-[#7c6fff]/30">
      <style jsx global>{`
        :root {
          --navy: #0b0f2e;
          --field: #eef0f7;
          --text-dark: #14162a;
          --muted-dark: #6b6f8a;
          --muted-light: #a6acc9;
          --accent: #7c6fff;
          --accent-2: #37e0c1;
        }

        .form-side {
          flex: 0 0 47%; display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 48px 40px; background: white;
        }
        .form-inner { max-width: 340px; width: 100%; }

        .logo {
          font-family: 'Sora', sans-serif; font-weight: 700; font-size: 19px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-bottom: 40px; color: var(--text-dark); text-decoration: none;
        }
        .logo-mark { width: 20px; height: 20px; border-radius: 6px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); }

        .login-h1 { font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 28px; }

        .field-label { display: block; font-size: 14px; font-weight: 500; color: var(--text-dark); margin-bottom: 8px; margin-top: 18px; }
        .field-label:first-of-type { margin-top: 0; }
        .field-input {
          width: 100%; padding: 13px 14px; border-radius: 10px; border: none;
          background: var(--field); color: var(--text-dark); font-size: 14.5px; font-family: 'Inter', sans-serif;
        }
        .field-input::placeholder { color: #9599b3; }
        .field-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

        .row-between { display: flex; justify-content: space-between; align-items: baseline; margin-top: 18px; }
        .row-between .field-label { margin: 0; }
        .forgot { font-size: 13px; color: var(--accent); text-decoration: none; font-weight: 500; }
        .forgot:hover { text-decoration: underline; }

        .btn-primary {
          width: 100%; margin-top: 26px; padding: 14px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, var(--accent), #5a4dde); color: white;
          font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(124, 111, 255, 0.4); }

        .switch { text-align: center; margin-top: 18px; font-size: 14px; color: var(--muted-dark); }
        .switch a { color: var(--accent); text-decoration: none; font-weight: 600; }

        .demo-helper {
          margin-top: 20px; text-align: center; font-size: 12.5px; color: var(--muted-dark);
        }
        .demo-helper button {
          color: var(--accent); background: none; border: none; font-weight: 600; cursor: pointer; text-decoration: underline;
        }

        .error-msg {
          margin-bottom: 16px; padding: 10px 14px; border-radius: 8px;
          background: #fff1f2; border: 1px solid #fecdd3; color: #be123c;
          font-size: 13.5px; font-weight: 500;
        }

        .visual-side {
          flex: 1; position: relative; background: var(--navy);
          display: flex; flex-direction: column; padding: 32px;
        }
        .visual-card {
          flex: 1; border-radius: 16px; overflow: hidden; position: relative;
          background: linear-gradient(150deg, #1a1f4d, #0e1238);
          display: flex; align-items: center; justify-content: center;
        }
        .abstract-graphic { width: 78%; display: flex; flex-direction: column; gap: 10px; }
        .list-item {
          background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;
        }
        .list-item .name { color: white; font-size: 14px; font-weight: 500; }
        .list-item .tag { font-size: 11px; color: var(--accent-2); background: rgba(55, 224, 193, 0.14); padding: 4px 10px; border-radius: 999px; }

        .visual-copy { padding: 28px 8px 8px; }
        .visual-copy h2 { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: white; margin-bottom: 10px; letter-spacing: -0.01em; }
        .visual-copy p { color: var(--muted-light); font-size: 14.5px; line-height: 1.6; max-width: 400px; }

        .dots { display: flex; gap: 7px; padding: 0 8px 8px; }
        .dots span { width: 7px; height: 7px; border-radius: 50%; background: rgba(255, 255, 255, 0.25); }
        .dots span.active { background: white; }

        @media (max-width: 900px) {
          .visual-side { display: none; }
          .form-side { flex: 1; }
        }
      `}</style>

      {/* Form Side (47%) */}
      <div className="form-side">
        <div className="form-inner">
          <Link href="/" className="logo">
            <div className="logo-mark" />
            <span>Distil</span>
          </Link>

          <h1 className="login-h1">Login</h1>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="row-between">
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); handleDemoFill(); }} className="forgot">
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              className="field-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>

          <p className="switch">
            Don&apos;t have an account? <Link href="/signup">Register</Link>
          </p>

          <div className="demo-helper">
            Testing default depot?{" "}
            <button type="button" onClick={handleDemoFill}>
              Fill Demo Login
            </button>
          </div>
        </div>
      </div>

      {/* Visual Side (53%) */}
      <div className="visual-side">
        <div className="visual-card">
          <div className="abstract-graphic">
            <div className="list-item">
              <span className="name">July 2026 Full Audit</span>
              <span className="tag">Reconciled</span>
            </div>
            <div className="list-item">
              <span className="name">August 2026 Audit</span>
              <span className="tag">Reconciled</span>
            </div>
            <div className="list-item">
              <span className="name">September 2026 Audit</span>
              <span
                className="tag"
                style={{ color: "var(--muted-light)", background: "rgba(255,255,255,0.06)" }}
              >
                In progress
              </span>
            </div>
          </div>
        </div>
        <div className="visual-copy">
          <h2>Log back in</h2>
          <p>Pick up where you left off. Every month&apos;s audit, saved and ready to review.</p>
        </div>
        <div className="dots">
          <span />
          <span className="active" />
          <span />
        </div>
      </div>
    </div>
  );
}
