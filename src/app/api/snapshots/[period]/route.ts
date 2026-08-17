import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bsytjouvkjlkroqljxae.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeXRqb3V2a2psa3JvcWxqeGFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0NTUzNCwiZXhwIjoyMTAyMDIxNTM0fQ.PrIex3J3zeaUPgyYt7v1m2g1pir2Mott-Wl9TdeR-q8";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  const { period } = await params;
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") || "kane-jones";

  const depotRes = await fetch(
    `${SUPABASE_URL}/rest/v1/depots?client_id=eq.${encodeURIComponent(clientId)}&select=id`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  const depotRows = await depotRes.json();
  const depotId = depotRows && depotRows.length > 0 ? depotRows[0].id : null;

  if (!depotId || !period) {
    return NextResponse.json(
      { detail: "Snapshot not found." },
      { status: 404 }
    );
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/audits?depot_id=eq.${depotId}&period_label=eq.${encodeURIComponent(period)}&select=payload,storage_path&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        cache: "no-store",
      }
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
