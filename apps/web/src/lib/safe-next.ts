export function safeNext(raw: string | null, fallback = "/app"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || raw.includes("\\")) {
    return fallback;
  }
  try {
    const url = new URL(raw, "http://walls.local");
    if (url.origin !== "http://walls.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
