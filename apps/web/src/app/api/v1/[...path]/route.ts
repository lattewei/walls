import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const HOP = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
];

function upstreamBase() {
  return (process.env.WALLS_API_PROXY ?? "http://127.0.0.1:8080").replace(/\/$/, "");
}

function clientIP(req: NextRequest): string | null {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real && isIP(real)) return real;
  const fwd = req.headers.get("x-forwarded-for");
  if (!fwd) return null;
  const parts = fwd
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1];
  return last && isIP(last) ? last : null;
}

function isIP(value: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || value.includes(":");
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const target = `${upstreamBase()}/api/v1/${pathParts.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  const contentType = req.headers.get("content-type");
  const range = req.headers.get("range");
  const accept = req.headers.get("accept");
  if (auth) headers.set("authorization", auth);
  if (contentType) headers.set("content-type", contentType);
  if (range) headers.set("range", range);
  if (accept) headers.set("accept", accept);
  const ip = clientIP(req);
  if (ip) {
    headers.set("x-forwarded-for", ip);
    headers.set("x-real-ip", ip);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "proxy_error",
          message: "Could not reach the server. Try again.",
        },
      },
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  for (const name of HOP) {
    const value = upstream.headers.get(name);
    if (value) outHeaders.set(name, value);
  }
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
