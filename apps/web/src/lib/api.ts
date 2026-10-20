const base = () =>
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export type ApiError = {
  code: string;
  message: string;
};

export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers: extra, ...rest } = init;
  const headers = new Headers(extra);
  if (!headers.has("Content-Type") && rest.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${base()}${path}`, {
    ...rest,
    headers,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
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
