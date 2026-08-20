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
  const targetUrl = `${cleanBase}/api/presentation${url.search}`;

  try {
    const proxyRes = await fetch(targetUrl);
    if (!proxyRes.ok) {
      const err = await proxyRes.text();
      return new NextResponse(err, { status: proxyRes.status });
    }
    const blob = await proxyRes.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type":
          proxyRes.headers.get("Content-Type") ||
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition":
          proxyRes.headers.get("Content-Disposition") ||
          'attachment; filename="management_intelligence.pptx"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Presentation proxy error: ${err.message}` },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
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
  const targetUrl = `${cleanBase}/api/presentation${url.search}`;

  try {
    const body = await request.json();
    const proxyRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!proxyRes.ok) {
      const err = await proxyRes.text();
      return new NextResponse(err, { status: proxyRes.status });
    }

    const blob = await proxyRes.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type":
          proxyRes.headers.get("Content-Type") ||
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition":
          proxyRes.headers.get("Content-Disposition") ||
          'attachment; filename="management_intelligence.pptx"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Presentation proxy error: ${err.message}` },
      { status: 502 }
    );
  }
}
