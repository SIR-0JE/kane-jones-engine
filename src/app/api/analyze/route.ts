import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
        { detail: `Analysis engine error: ${err.message}` },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    {
      detail:
        "Analysis engine offline. Ensure Python FastAPI backend is running or configure ANALYSIS_API_URL.",
    },
    { status: 503 }
  );
}
