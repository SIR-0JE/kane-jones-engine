import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const targetBase =
    process.env.ANALYSIS_API_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");

  if (!targetBase) {
    return NextResponse.json(
      { detail: "ANALYSIS_API_URL not configured." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const cleanBase = targetBase.replace(/\/$/, "");
  const targetUrl = `${cleanBase}/api/compare${url.search}`;

  try {
    const proxyRes = await fetch(targetUrl);
    const data = await proxyRes.json();
    return NextResponse.json(data, { status: proxyRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Comparison proxy error: ${err.message}` },
      { status: 502 }
    );
  }
}
