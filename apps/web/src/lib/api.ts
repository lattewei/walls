export function apiBase() {
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://127.0.0.1:8080"
  ).replace(/\/$/, "");
}

export function apiUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:")) return path;
  if (path.startsWith("/")) return `${apiBase()}${path}`;
  return `${apiBase()}/${path}`;
}

export type ApiError = {
  code: string;
  message: string;
};

export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export function isApiRequestError(err: unknown): err is ApiRequestError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "ApiRequestError" &&
    typeof (err as { message?: string }).message === "string"
  );
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers: extra, ...rest } = init;
  const headers = new Headers(extra);
  if (
    rest.body &&
    !(rest.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${apiBase()}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError(
      0,
      "network_error",
      "Could not reach the server. Try again.",
    );
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (token && res.status === 401 && typeof window !== "undefined") {
    const { clearSession } = await import("./auth");
    clearSession();
    window.dispatchEvent(new Event("walls:session"));
  }

  if (!res.ok) {
    const err = data as { error?: ApiError } | null;
    throw new ApiRequestError(
      res.status,
      err?.error?.code ?? "request_failed",
      err?.error?.message ?? `Request failed (${res.status})`,
    );
  }

  return data as T;
}
