import { AnalyzeResponse, CompareResponse, SnapshotsListResponse } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function fetchSnapshots(clientId = "kane-jones"): Promise<SnapshotsListResponse> {
  const res = await fetch(`${API_BASE}/api/snapshots?client_id=${encodeURIComponent(clientId)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch snapshots list");
  }
  return res.json();
}

export async function fetchSnapshot(periodLabel: string, clientId = "kane-jones"): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/snapshots/${encodeURIComponent(periodLabel)}?client_id=${encodeURIComponent(clientId)}`);
  if (!res.ok) {
    // Fallback to /api/snapshot?period_label=...
    const fallbackRes = await fetch(`${API_BASE}/api/snapshot?period_label=${encodeURIComponent(periodLabel)}&client_id=${encodeURIComponent(clientId)}`);
    if (!fallbackRes.ok) {
      throw new Error(`Failed to load snapshot for period ${periodLabel}`);
    }
    return fallbackRes.json();
  }
  return res.json();
}

export async function uploadAndAnalyze(
  file: File,
  clientId = "kane-jones",
  periodLabel?: string,
  auditTitle?: string
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("client_id", clientId);
  if (periodLabel) {
    formData.append("period_label", periodLabel);
  }
  if (auditTitle) {
    formData.append("audit_title", auditTitle);
  }

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to analyze spreadsheet." }));
    throw new Error(err.detail || "Analysis request failed");
  }

  return res.json();
}

export async function fetchComparison(
  clientId = "kane-jones",
  granularity: "day" | "week" | "month" = "day",
  periodA = "2026-07",
  periodB = "2026-07",
  keyA?: string,
  keyB?: string
): Promise<CompareResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    granularity,
    period_a: periodA,
    period_b: periodB,
  });
  if (keyA) params.append("key_a", keyA);
  if (keyB) params.append("key_b", keyB);

  const res = await fetch(`${API_BASE}/api/compare?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch comparison." }));
    throw new Error(err.detail || "Comparison request failed");
  }

  return res.json();
}

export function formatCurrency(amount: number | null | undefined, symbol = "₦"): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("en-US").format(val);
}
