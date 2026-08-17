import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let targetUrl = "";

  if (process.env.ANALYSIS_API_URL) {
    targetUrl = `${process.env.ANALYSIS_API_URL.replace(/\/$/, "")}/api/analyze`;
  } else if (process.env.NODE_ENV === "development") {
    targetUrl = "http://127.0.0.1:8000/api/analyze";
  } else {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      process.env.VERCEL_URL ||
      "kane-jones-engine.vercel.app";
    const proto = host.includes("localhost") ? "http" : "https";
    targetUrl = `${proto}://${host}/api/index.py`;
  }

  try {
    const formData = await request.formData();
    const proxyRes = await fetch(targetUrl, {
      method: "POST",
      body: formData,
    });

    if (!proxyRes.ok) {
      const errText = await proxyRes.text().catch(() => "");
      try {
        const errJson = JSON.parse(errText);
        return NextResponse.json(errJson, { status: proxyRes.status });
      } catch {
        return NextResponse.json(
          {
            detail:
              errText ||
              `Analysis engine responded with status ${proxyRes.status}`,
          },
          { status: proxyRes.status }
        );
      }
    }

    const json = await proxyRes.json();
    return NextResponse.json(json, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Analysis engine dispatch error: ${err.message}` },
      { status: 502 }
    );
  }
}
