import { NextRequest, NextResponse } from "next/server";

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
      { headers: supabaseHeaders }
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join("/");
  const url = new URL(request.url);

  // 1. Health Check
  if (pathStr === "health" || pathStr === "") {
    return NextResponse.json({
      status: "ok",
      service: "depot-sales-intelligence-engine",
    });
  }

  // 2. Snapshots list: /api/snapshots
  if (pathStr === "snapshots") {
    const clientId = url.searchParams.get("client_id") || "kane-jones";
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
        { headers: supabaseHeaders }
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
  }

  // 3. Single Snapshot: /api/snapshots/[period] or /api/snapshot?period_label=...
  if (pathStr.startsWith("snapshots/") || pathStr === "snapshot") {
    let period = "";
    if (pathStr.startsWith("snapshots/")) {
      period = pathStr.replace("snapshots/", "");
    } else {
      period =
        url.searchParams.get("period_label") ||
        url.searchParams.get("period") ||
        "";
    }

    const clientId = url.searchParams.get("client_id") || "kane-jones";
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
        { headers: supabaseHeaders }
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

  // 4. Depot Check: /api/depots/check?client_id=...
  if (pathStr === "depots/check") {
    const clientId = url.searchParams.get("client_id") || "kane-jones";
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/depots?client_id=eq.${encodeURIComponent(clientId)}&select=id,client_id,display_name`,
        { headers: supabaseHeaders }
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
      console.error(err);
    }
    return NextResponse.json({
      exists: false,
      id: null,
      client_id: clientId,
      display_name: null,
    });
  }

  // Default fallback for dev local backend
  if (process.env.NODE_ENV === "development") {
    try {
      const devRes = await fetch(`http://127.0.0.1:8000/api/${pathStr}${url.search}`);
      const body = await devRes.text();
      return new NextResponse(body, {
        status: devRes.status,
        headers: { "Content-Type": devRes.headers.get("Content-Type") || "application/json" },
      });
    } catch (err) {
      console.error("Local dev proxy error:", err);
    }
  }

  return NextResponse.json(
    { detail: `Endpoint /api/${pathStr} not found` },
    { status: 404 }
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join("/");

  // 1. Rename Snapshot / Audit: /api/snapshots/rename or /api/audits/rename
  if (pathStr === "snapshots/rename" || pathStr === "audits/rename") {
    try {
      const formData = await request.formData();
      const clientId = (formData.get("client_id") as string) || "kane-jones";
      const periodLabel = formData.get("period_label") as string;
      const newTitle = formData.get("new_audit_title") as string;

      const depotId = await getDepotId(clientId);
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
          headers: supabaseHeaders,
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

  // 2. Register Depot: /api/depots/register
  if (pathStr === "depots/register") {
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
            ...supabaseHeaders,
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

  // 3. Analyze Endpoint: /api/analyze
  if (pathStr === "analyze") {
    // In local development or if NEXT_PUBLIC_API_URL / external engine is defined:
    const targetBase =
      process.env.ANALYSIS_API_URL ||
      (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");

    if (targetBase) {
      try {
        const formData = await request.formData();
        const proxyRes = await fetch(`${targetBase}/api/analyze`, {
          method: "POST",
          body: formData,
        });
        const json = await proxyRes.json();
        return NextResponse.json(json, { status: proxyRes.status });
      } catch (err: any) {
        return NextResponse.json(
          { detail: `Analysis service error: ${err.message}` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        detail:
          "Analysis engine offline. Ensure Python backend is running or configured in environment.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { detail: `Endpoint /api/${pathStr} not found` },
    { status: 404 }
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join("/");
  const url = new URL(request.url);

  if (pathStr === "snapshots" || pathStr.startsWith("snapshots/")) {
    let period = url.searchParams.get("period_label") || "";
    if (pathStr.startsWith("snapshots/")) {
      period = pathStr.replace("snapshots/", "");
    }
    const clientId = url.searchParams.get("client_id") || "kane-jones";

    const depotId = await getDepotId(clientId);
    if (!depotId || !period) {
      return NextResponse.json(
        { detail: "Missing depot or period for deletion." },
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
  }

  return NextResponse.json(
    { detail: `Delete on /api/${pathStr} not supported` },
    { status: 404 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
