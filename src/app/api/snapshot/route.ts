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
  const period =
    url.searchParams.get("period_label") ||
    url.searchParams.get("period") ||
    "";

  // 1. Try local FastAPI backend first
  try {
    const resFastApi = await fetch(
      `http://127.0.0.1:8000/api/snapshot?period_label=${encodeURIComponent(period)}&client_id=${encodeURIComponent(clientId)}`,
      { cache: "no-store" }
    );
    if (resFastApi.ok) {
      const data = await resFastApi.json();
      if (data && (data.meta || data.period_label)) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    // Fallback to Supabase direct query
  }

  const depotId = await getDepotId(clientId);
  if (!depotId || !period) {
    return NextResponse.json(
      { detail: "Snapshot not found." },
      { status: 404 }
    );
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/audits?depot_id=eq.${depotId}&period_label=eq.${encodeURIComponent(period)}&select=payload,storage_path&order=created_at.desc&limit=1`,
      { headers: supabaseHeaders, cache: "no-store" }
    );
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0 && rows[0].payload) {
        return NextResponse.json(rows[0].payload);
      }
    }
    return NextResponse.json(
      { detail: `Snapshot for period '${period}' not found.` },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Failed to load snapshot: ${err.message}` },
      { status: 500 }
    );
  }
}
