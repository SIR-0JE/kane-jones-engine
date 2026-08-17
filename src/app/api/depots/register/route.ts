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
    const body = await request.json();
    const { client_id, display_name } = body;
    if (!client_id) {
      return NextResponse.json(
        { detail: "client_id is required." },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/depots?on_conflict=client_id`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          client_id,
          display_name: display_name || client_id,
          config: {},
        }),
      }
    );
    if (res.ok) {
      const rows = await res.json();
      return NextResponse.json({
        status: "success",
        depot: rows[0] || { client_id, display_name },
      });
    }
    return NextResponse.json(
      { detail: "Failed to register depot." },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Registration error: ${err.message}` },
      { status: 500 }
    );
  }
}
