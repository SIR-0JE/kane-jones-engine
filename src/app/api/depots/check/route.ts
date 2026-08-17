import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bsytjouvkjlkroqljxae.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeXRqb3V2a2psa3JvcWxqeGFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0NTUzNCwiZXhwIjoyMTAyMDIxNTM0fQ.PrIex3J3zeaUPgyYt7v1m2g1pir2Mott-Wl9TdeR-q8";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") || "kane-jones";

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/depots?client_id=eq.${encodeURIComponent(clientId)}&select=id,client_id,display_name`,
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
      if (rows && rows.length > 0) {
        return NextResponse.json({
          exists: true,
          id: rows[0].id,
          client_id: rows[0].client_id,
          display_name: rows[0].display_name,
        });
      }
    }
  } catch (err) {
    console.error("depots/check error:", err);
  }

  return NextResponse.json({
    exists: false,
    id: null,
    client_id: clientId,
    display_name: null,
  });
}
