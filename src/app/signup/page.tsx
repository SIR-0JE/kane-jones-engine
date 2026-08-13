"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentSession, signupUser, validateEmail } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [depotName, setDepotName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

    if (!depotName.trim()) {
      setError("Please enter your depot or company name.");
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signupUser({
        depotName,
        name,
        email,
        password,
        confirmPassword,
      });
      router.push("/app");
    } catch (err: any) {
      setError(err?.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-body min-h-screen w-full flex bg-white text-[#14162a] font-sans selection:bg-[#7c6fff]/30">
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

        .signup-h1 { font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 28px; }

        .field-label { display: block; font-size: 14px; font-weight: 500; color: var(--text-dark); margin-bottom: 8px; margin-top: 18px; }
        .field-label:first-of-type { margin-top: 0; }
        .field-input {
          width: 100%; padding: 13px 14px; border-radius: 10px; border: none;
          background: var(--field); color: var(--text-dark); font-size: 14.5px; font-family: 'Inter', sans-serif;
        }
        .field-input::placeholder { color: #9599b3; }
        .field-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

        .btn-primary {
          width: 100%; margin-top: 26px; padding: 14px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, var(--accent), #5a4dde); color: white;
          font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(124, 111, 255, 0.4); }

        .switch { text-align: center; margin-top: 18px; font-size: 14px; color: var(--muted-dark); }
        .switch a { color: var(--accent); text-decoration: none; font-weight: 600; }

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
        .abstract-graphic { width: 78%; }
        .abstract-graphic .bar-row { display: flex; align-items: flex-end; gap: 10px; height: 120px; margin-bottom: 18px; }
        .abstract-graphic .bar { flex: 1; border-radius: 6px 6px 0 0; background: linear-gradient(180deg, var(--accent-2), transparent); opacity: 0.85; }
        .abstract-graphic .card {
          background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px; padding: 16px; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        }
        .abstract-graphic .card .l { font-size: 11px; color: var(--muted-light); margin-bottom: 6px; }
        .abstract-graphic .card .v { font-size: 20px; font-weight: 700; font-family: 'Sora', sans-serif; color: white; }
        .abstract-graphic .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }

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

          <h1 className="signup-h1">Registration</h1>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label htmlFor="depot" className="field-label">
              Depot / company name
            </label>
            <input
              id="depot"
              type="text"
              className="field-input"
              placeholder="e.g. Kane-Jones Depot"
              value={depotName}
              onChange={(e) => setDepotName(e.target.value)}
            />

            <label htmlFor="name" className="field-label">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="field-input"
              placeholder="e.g. Adewale Ojo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

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

            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field-input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label htmlFor="confirm" className="field-label">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              className="field-input"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Registering…" : "Register"}
            </button>
          </form>

          <p className="switch">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>

      {/* Visual Side (53%) */}
      <div className="visual-side">
        <div className="visual-card">
          <div className="abstract-graphic">
            <div className="bar-row">
              <div className="bar" style={{ height: "40%" }} />
              <div className="bar" style={{ height: "70%" }} />
              <div className="bar" style={{ height: "55%" }} />
              <div className="bar" style={{ height: "90%" }} />
              <div className="bar" style={{ height: "65%" }} />
              <div className="bar" style={{ height: "100%" }} />
              <div className="bar" style={{ height: "50%" }} />
            </div>
            <div className="card">
              <div className="l">Pricing leakage caught</div>
              <div className="v">₦11.1M</div>
              <div className="row2">
                <div>
                  <div className="l">Invoices</div>
                  <div className="v" style={{ fontSize: "15px" }}>
                    300
                  </div>
                </div>
                <div>
                  <div className="l">Margin</div>
                  <div className="v" style={{ fontSize: "15px" }}>
                    2.0%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="visual-copy">
          <h2>Quick set-up</h2>
          <p>Creating an account should not take an afternoon. Upload your first sales register and see your audit in minutes.</p>
        </div>
        <div className="dots">
          <span className="active" />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
