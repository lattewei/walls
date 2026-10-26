import { apiFetch } from "./api";
import type { AdminReport, Claim } from "./types";

export async function listAdminReports(
  token: string,
  status = "",
  limit = 50,
) {
  const filter = status ? `&status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ reports: AdminReport[]; total: number }>(
    `/api/v1/admin/reports?limit=${limit}&offset=0${filter}`,
    { token },
  );
}

export async function updateAdminReport(
  reportId: string,
  status: string,
  token: string,
) {
  return apiFetch<{ report: AdminReport }>(
    `/api/v1/admin/reports/${encodeURIComponent(reportId)}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    },
  );
}

export async function hideAdminTrack(trackId: string, token: string) {
  return apiFetch<{ status: string }>(
    `/api/v1/admin/tracks/${encodeURIComponent(trackId)}/hide`,
    { method: "POST", token },
  );
}

export async function listAdminClaims(token: string, limit = 50) {
  return apiFetch<{
    claims: Claim[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/admin/claims?limit=${limit}&offset=0`, { token });
}

export async function reviewAdminClaim(
  claimId: string,
  status: "accepted" | "rejected",
  token: string,
) {
  return apiFetch<{ claim: Claim }>(
    `/api/v1/admin/claims/${encodeURIComponent(claimId)}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    },
  );
}
