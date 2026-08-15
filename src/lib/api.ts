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

export async function deleteSnapshot(periodLabel: string, clientId = "kane-jones"): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/api/snapshots?client_id=${encodeURIComponent(clientId)}&period_label=${encodeURIComponent(periodLabel)}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete snapshot." }));
    throw new Error(err.detail || "Delete snapshot request failed");
  }
  return true;
}

export async function renameSnapshot(
  periodLabel: string,
  newTitle: string,
  clientId = "kane-jones"
): Promise<boolean> {
  const formData = new FormData();
  formData.append("client_id", clientId);
  formData.append("period_label", periodLabel);
  formData.append("new_audit_title", newTitle);

  const res = await fetch(`${API_BASE}/api/snapshots/rename`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to rename snapshot." }));
    throw new Error(err.detail || "Rename snapshot request failed");
  }
  return true;
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

export function formatCompactCurrency(
  amount: number | null | undefined,
  symbol = "₦",
  decimals = 2
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  const sign = amount < 0 ? "−" : "";
  const abs = Math.abs(amount);

  if (abs >= 1_000_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (abs >= 1_000_000) {
    // If it's a 3-decimal amount like 1.635M, keep clean
    const inM = abs / 1_000_000;
    const str = inM.toFixed(decimals);
    return `${sign}${symbol}${str}M`;
  }
  if (abs >= 100_000) {
    // E.g. ₦460,000 -> ₦0.46M
    const inM = abs / 1_000_000;
    return `${sign}${symbol}${inM.toFixed(decimals)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${symbol}${(abs / 1_000).toFixed(1)}k`;
  }

  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  return `${sign}${symbol}${formatted}`;
}

export function formatCurrency(
  amount: number | null | undefined,
  symbol = "₦",
  compact = false
): string {
  if (compact) {
    return formatCompactCurrency(amount, symbol);
  }
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
