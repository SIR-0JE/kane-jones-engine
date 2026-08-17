import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const targetBase =
    process.env.ANALYSIS_API_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");

  if (!targetBase) {
    return NextResponse.json(
      {
        detail:
          "ANALYSIS_API_URL environment variable is not configured on Vercel. Please add your Render URL (e.g. https://your-app.onrender.com) in Vercel Project Settings -> Environment Variables.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const cleanBase = targetBase.replace(/\/$/, "");
    const targetUrl = `${cleanBase}/api/analyze`;

    const proxyRes = await fetch(targetUrl, {
      method: "POST",
      body: formData,
    });

    const data = await proxyRes.json();
    return NextResponse.json(data, { status: proxyRes.status });
  } catch (err: any) {
    console.error("Analysis proxy error:", err);
    return NextResponse.json(
      {
        detail: `Failed to connect to Render analysis engine (${err.message}). Please ensure Render is Live.`,
      },
      { status: 502 }
    );
  }
}
