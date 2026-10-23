import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function upstreamBase() {
  return (process.env.WALLS_API_PROXY ?? "http://127.0.0.1:8080").replace(/\/$/, "");
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const target = `${upstreamBase()}/api/v1/${pathParts.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  const contentType = req.headers.get("content-type");
  if (auth) headers.set("authorization", auth);
  if (contentType) headers.set("content-type", contentType);

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "upstream fetch failed";
    return NextResponse.json(
      {
        error: {
          code: "proxy_error",
          message: `Could not reach Go API at ${upstreamBase()} (${message}). Is go run ./cmd/api running?`,
        },
      },
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) outHeaders.set("content-type", ct);

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
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
