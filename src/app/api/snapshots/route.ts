import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bsytjouvkjlkroqljxae.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeXRqb3V2a2psa3JvcWxqeGFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0NTUzNCwiZXhwIjoyMTAyMDIxNTM0fQ.PrIex3J3zeaUPgyYt7v1m2g1pir2Mott-Wl9TdeR-q8";

const supabaseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function getDepotId(clientId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/depots?client_id=eq.${encodeURIComponent(clientId)}&select=id`,
      { headers: supabaseHeaders, cache: "no-store" }
    );
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0) {
        return rows[0].id;
      }
    }
  } catch (err) {
    console.error("Error fetching depot ID:", err);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") || "kane-jones";

  // 1. Try local FastAPI backend first
  try {
    const resFastApi = await fetch(
      `http://127.0.0.1:8000/api/snapshots?client_id=${encodeURIComponent(clientId)}`,
      { cache: "no-store" }
    );
    if (resFastApi.ok) {
      const data = await resFastApi.json();
      if (data && data.snapshots && data.snapshots.length > 0) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    // Fallback to Supabase direct query
  }

  const depotId = await getDepotId(clientId);
  if (!depotId) {
    return NextResponse.json({
      client_id: clientId,
      depot_id: null,
      snapshots: [],
    });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/audits?depot_id=eq.${depotId}&select=period_label,audit_title,summary,created_at&order=created_at.desc`,
      { headers: supabaseHeaders, cache: "no-store" }
    );
    if (res.ok) {
      const rows = await res.json();
      const snapshots = rows.map((r: any) => ({
        period_label: r.period_label,
        audit_title: r.audit_title || `${r.period_label} Audit`,
        total_revenue: r.summary?.total_revenue || 0,
        total_gross_profit: r.summary?.total_gross_profit || 0,
        overall_margin_pct: r.summary?.overall_margin_pct || 0,
        total_invoices: r.summary?.total_invoices || 0,
        total_recoverable_leakage: r.summary?.total_recoverable_leakage || 0,
        below_floor_items_count: r.summary?.below_floor_items_count || 0,
        loss_making_customers_count:
          r.summary?.loss_making_customers_count || 0,
        currency_symbol: r.summary?.currency_symbol || "₦",
        date_range: r.summary?.date_range || {
          start: r.period_label,
          end: r.period_label,
        },
        created_at: r.created_at,
      }));
      return NextResponse.json({
        client_id: clientId,
        depot_id: depotId,
        snapshots,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Failed to fetch snapshots: ${err.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    client_id: clientId,
    depot_id: depotId,
    snapshots: [],
  });
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") || "kane-jones";
  const period = url.searchParams.get("period_label") || "";

  const depotId = await getDepotId(clientId);
  if (!depotId || !period) {
    return NextResponse.json(
      { detail: "Missing depot or period." },
      { status: 400 }
    );
  }

  try {
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/audits?depot_id=eq.${depotId}&period_label=eq.${encodeURIComponent(period)}`,
      {
        method: "DELETE",
        headers: supabaseHeaders,
      }
    );
    if (delRes.ok) {
      return NextResponse.json({ success: true, deleted_period: period });
    }
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Delete error: ${err.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { detail: "Failed to delete snapshot." },
    { status: 500 }
  );
}
