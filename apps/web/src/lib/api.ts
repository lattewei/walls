import type {
  ApiError,
  AuthResponse,
  PublicArtist,
  PublicContacts,
  PublicTrack,
  PublicUser,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<never> {
  let code = "request_failed";
  let message = res.statusText || "Request failed";
  try {
    const body = (await res.json()) as ApiError;
    if (body?.error?.code) code = body.error.code;
    if (body?.error?.message) message = body.error.message;
  } catch {
    /* ignore */
  }
  throw new ApiClientError(res.status, code, message);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  register(body: { handle: string; password: string; display_name?: string }) {
    return request<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  login(body: { handle: string; password: string }) {
    return request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  me(token: string) {
    return request<{ user: PublicUser; contacts: PublicContacts }>("/api/v1/me", {}, token);
  },

  updateMe(
    token: string,
    body: Record<string, unknown>,
  ) {
    return request<{ user: PublicUser; contacts: PublicContacts }>(
      "/api/v1/me",
      { method: "PATCH", body: JSON.stringify(body) },
      token,
    );
  },

  getUser(handle: string) {
    return request<{ user: PublicUser; contacts: PublicContacts }>(
      `/api/v1/users/${encodeURIComponent(handle)}`,
    );
  },

  listArtists(params?: { q?: string; limit?: number; offset?: number }) {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    const q = sp.toString();
    return request<{
      artists: PublicArtist[];
      total: number;
      limit: number;
      offset: number;
    }>(`/api/v1/artists${q ? `?${q}` : ""}`);
  },

  getArtist(slug: string) {
    return request<{ artist: PublicArtist }>(
      `/api/v1/artists/${encodeURIComponent(slug)}`,
    );
  },

  createArtist(
    token: string,
    body: { name: string; slug?: string; bio?: string; genres?: string[] },
  ) {
    return request<{ artist: PublicArtist }>(
      "/api/v1/artists",
      { method: "POST", body: JSON.stringify(body) },
      token,
    );
  },

  listArtistTracks(slug: string, params?: { limit?: number; offset?: number }) {
    const sp = new URLSearchParams();
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    const q = sp.toString();
    return request<{
      tracks: PublicTrack[];
      total: number;
      limit: number;
      offset: number;
    }>(`/api/v1/artists/${encodeURIComponent(slug)}/tracks${q ? `?${q}` : ""}`);
  },

  getTrack(id: string) {
    return request<{ track: PublicTrack }>(`/api/v1/tracks/${id}`);
  },

  uploadTrack(token: string, form: FormData) {
    return request<{ track: PublicTrack }>(
      "/api/v1/tracks",
      { method: "POST", body: form },
      token,
    );
  },

  audioUrl(pathOrId: string) {
    if (pathOrId.startsWith("http") || pathOrId.startsWith("/api/")) {
      return pathOrId.startsWith("http") ? pathOrId : `${API_URL}${pathOrId}`;
    }
    return `${API_URL}/api/v1/tracks/${pathOrId}/audio`;
  },
};

export { API_URL };
