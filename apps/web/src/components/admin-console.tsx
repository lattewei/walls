"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  hideAdminTrack,
  listAdminClaims,
  listAdminReports,
  reviewAdminClaim,
  updateAdminReport,
} from "@/lib/admin";
import { isApiRequestError } from "@/lib/api";
import { useSessionToken } from "@/lib/session";
import type { AdminReport, Claim } from "@/lib/types";

type Tab = "reports" | "claims";

const reportFilters = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminConsole() {
  const token = useSessionToken();
  const [tab, setTab] = useState<Tab>("reports");
  const [status, setStatus] = useState("");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimTotal, setClaimTotal] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmHide, setConfirmHide] = useState<string | null>(null);
  const queryKey = token ? `${tab}:${status}:${nonce}:${token}` : "";
  const loading = Boolean(token) && loadedKey !== queryKey;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        if (tab === "reports") {
          const data = await listAdminReports(token, status);
          if (cancelled) return;
          setReports(data.reports);
          setReportTotal(data.total);
        } else {
          const data = await listAdminClaims(token);
          if (cancelled) return;
          setClaims(data.claims);
          setClaimTotal(data.total);
        }
        if (!cancelled) setDenied(false);
      } catch (err) {
        if (!cancelled) {
          if (isApiRequestError(err) && err.status === 403) setDenied(true);
          else setError(isApiRequestError(err) ? err.message : "Could not load the queue.");
        }
      } finally {
        if (!cancelled) setLoadedKey(queryKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryKey, status, tab, token]);

  async function onReportStatus(report: AdminReport, next: string) {
    if (!token) return;
    setBusyKey(report.id);
    setError(null);
    setNotice(null);
    try {
      const { report: updated } = await updateAdminReport(report.id, next, token);
      setReports((prev) => {
        const mapped = prev.map((r) => (r.id === updated.id ? updated : r));
        return status && updated.status !== status
          ? mapped.filter((r) => r.id !== updated.id)
          : mapped;
      });
      if (status && updated.status !== status) {
        setReportTotal((n) => Math.max(0, n - 1));
      }
      setNotice(`Report marked ${updated.status}.`);
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not update the report.");
    } finally {
      setBusyKey(null);
    }
  }

  async function onHideTrack(report: AdminReport) {
    if (!token) return;
    if (confirmHide !== report.id) {
      setConfirmHide(report.id);
      return;
    }
    setBusyKey(report.id);
    setError(null);
    setNotice(null);
    try {
      await hideAdminTrack(report.target_id, token);
      setConfirmHide(null);
      setNotice("Track hidden from the catalog.");
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not hide the track.");
    } finally {
      setBusyKey(null);
    }
  }

  async function onReviewClaim(claim: Claim, next: "accepted" | "rejected") {
    if (!token) return;
    setBusyKey(claim.id);
    setError(null);
    setNotice(null);
    try {
      await reviewAdminClaim(claim.id, next, token);
      setClaims((prev) => prev.filter((c) => c.id !== claim.id));
      setClaimTotal((n) => Math.max(0, n - 1));
      setNotice(
        next === "accepted"
          ? "Claim accepted. The wall is now editable by the claimant."
          : "Claim rejected. The claimant can submit a new one.",
      );
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not review the claim.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!token) {
    return (
      <div className="mod">
        <p className="note note--empty">
          <Link href="/login?next=/admin">Log in</Link> with an admin account to open moderation.
        </p>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="mod">
        <p className="note note--empty">
          This page is for admins only. The API checks your current role on every request.
        </p>
      </div>
    );
  }

  return (
    <div className="mod">
      <header className="mod__head">
        <div>
          <h1>Moderation</h1>
          <p className="hint">Reports and wall claims. Every action is reviewed by hand.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => setNonce((n) => n + 1)}>
          Refresh
        </button>
      </header>

      <div className="mod__tabs" role="tablist" aria-label="Moderation queues">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reports"}
          className={tab === "reports" ? "is-on" : ""}
          onClick={() => {
            setTab("reports");
            setNotice(null);
            setError(null);
          }}
        >
          Reports
          <span>{reportTotal}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "claims"}
          className={tab === "claims" ? "is-on" : ""}
          onClick={() => {
            setTab("claims");
            setNotice(null);
            setError(null);
          }}
        >
          Claims
          <span>{claimTotal}</span>
        </button>
      </div>

      {tab === "reports" ? (
        <div className="mod__filters">
          {reportFilters.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              className={status === f.value ? "is-on" : ""}
              onClick={() => {
                setStatus(f.value);
                setError(null);
                setNotice(null);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="note note--err">{error}</p> : null}
      {notice ? <p className="note note--ok">{notice}</p> : null}

      {loading ? (
        <p className="note note--empty">Loading…</p>
      ) : tab === "reports" ? (
        reports.length === 0 ? (
          <p className="note note--empty">No reports in this queue.</p>
        ) : (
          <ul className="mod__list">
            {reports.map((report) => {
              const label = report.target_label || report.target_id;
              const href =
                report.target_type === "artist" && report.target_slug
                  ? `/artists/${report.target_slug}`
                  : report.target_type === "user" && report.target_slug
                    ? `/users/${report.target_slug}`
                    : null;
              return (
                <li key={report.id} className="mod__row">
                  <div>
                    <div className="mod__title">
                      <span className="mod__tag">{report.target_type}</span>
                      {href ? <Link href={href}>{label}</Link> : <strong>{label}</strong>}
                      <span className="mod__status">{report.status}</span>
                    </div>
                    <p className="mod__meta">
                      {report.reporter_handle
                        ? `Reported by @${report.reporter_handle}`
                        : "Reported by a deleted account"}{" "}
                      · {formatDate(report.created_at)}
                    </p>
                    <p className="mod__reason">
                      {report.reason}
                      {report.details ? <span>: {report.details}</span> : null}
                    </p>
                  </div>
                  <div className="mod__actions">
                    {report.status !== "reviewing" ? (
                      <button
                        type="button"
                        disabled={busyKey === report.id}
                        onClick={() => void onReportStatus(report, "reviewing")}
                      >
                        Reviewing
                      </button>
                    ) : null}
                    {report.status !== "resolved" ? (
                      <button
                        type="button"
                        disabled={busyKey === report.id}
                        onClick={() => void onReportStatus(report, "resolved")}
                      >
                        Resolve
                      </button>
                    ) : null}
                    {report.status !== "dismissed" ? (
                      <button
                        type="button"
                        disabled={busyKey === report.id}
                        onClick={() => void onReportStatus(report, "dismissed")}
                      >
                        Dismiss
                      </button>
                    ) : null}
                    {report.target_type === "track" ? (
                      <button
                        type="button"
                        className="is-danger"
                        disabled={busyKey === report.id}
                        onClick={() => void onHideTrack(report)}
                      >
                        {confirmHide === report.id ? "Confirm hide" : "Hide track"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : claims.length === 0 ? (
        <p className="note note--empty">No pending claims.</p>
      ) : (
        <ul className="mod__list">
          {claims.map((claim) => (
            <li key={claim.id} className="mod__row">
              <div>
                <div className="mod__title">
                  <span className="mod__tag">wall</span>
                  {claim.artist_slug ? (
                    <Link href={`/artists/${claim.artist_slug}`}>
                      {claim.artist_name || claim.artist_slug}
                    </Link>
                  ) : (
                    <strong>{claim.artist_name || claim.artist_id}</strong>
                  )}
                  <span className="mod__status">pending</span>
                </div>
                <p className="mod__meta">
                  @{claim.user_handle || "unknown"} · {formatDate(claim.created_at)}
                </p>
                <p className="mod__reason">
                  Code <code className="mod__code">{claim.claim_code}</code>
                  {" · "}
                  {claim.identity_url ? (
                    <a href={claim.identity_url} rel="noreferrer" target="_blank">
                      Official account
                    </a>
                  ) : (
                    "No account URL"
                  )}
                  {" · "}
                  {claim.proof_url ? (
                    <a href={claim.proof_url} rel="noreferrer" target="_blank">
                      Proof post
                    </a>
                  ) : (
                    "No proof post yet"
                  )}
                </p>
              </div>
              <div className="mod__actions">
                <button
                  type="button"
                  disabled={busyKey === claim.id}
                  onClick={() => void onReviewClaim(claim, "accepted")}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="is-danger"
                  disabled={busyKey === claim.id}
                  onClick={() => void onReviewClaim(claim, "rejected")}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
