import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bsytjouvkjlkroqljxae.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeXRqb3V2a2psa3JvcWxqeGFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0NTUzNCwiZXhwIjoyMTAyMDIxNTM0fQ.PrIex3J3zeaUPgyYt7v1m2g1pir2Mott-Wl9TdeR-q8";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const clientId = (formData.get("client_id") as string) || "kane-jones";
    const periodLabel = formData.get("period_label") as string;
    const newTitle = formData.get("new_audit_title") as string;

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

    if (!depotId || !periodLabel || !newTitle) {
      return NextResponse.json(
        { detail: "Missing required fields for rename." },
        { status: 400 }
      );
    }

    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/audits?depot_id=eq.${depotId}&period_label=eq.${encodeURIComponent(periodLabel)}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audit_title: newTitle.trim() }),
      }
    );
    if (patchRes.ok) {
      return NextResponse.json({ success: true, new_title: newTitle.trim() });
    }
    return NextResponse.json(
      { detail: "Failed to update audit title." },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Rename error: ${err.message}` },
      { status: 500 }
    );
  }
}
