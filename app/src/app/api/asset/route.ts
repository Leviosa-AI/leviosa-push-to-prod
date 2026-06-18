import { NextResponse } from "next/server";

// Same-origin proxy for generated video assets. The browser needs to read the
// video's pixels on a <canvas> for chroma-keying, which a cross-origin
// replicate.delivery URL would block (tainted canvas). Streaming it through our
// own origin makes the canvas readable. Restricted to replicate.delivery to
// avoid being an open proxy.

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !/^https:\/\/replicate\.delivery\//.test(url)) {
    return NextResponse.json({ error: "invalid or non-allowlisted url" }, { status: 400 });
  }
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
