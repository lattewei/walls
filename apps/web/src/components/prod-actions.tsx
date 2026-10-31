"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { reportTarget, withdrawTrack } from "@/lib/catalog";
import { useSessionUser } from "@/lib/session";
import type { ProdRow } from "@/lib/types";

export function ProdActions({ track }: { track: ProdRow }) {
  const router = useRouter();
  const user = useSessionUser();
  const owner = Boolean(user?.handle && track.uploaderHandle === user.handle);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function needToken() {
    const token = getToken();
    if (!token) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return null;
    }
    return token;
  }

  async function onReport(e: FormEvent) {
    e.preventDefault();
    const token = needToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await reportTarget(token, "track", track.id, reason.trim(), "");
      setReporting(false);
      setReason("");
      setNotice("Report sent.");
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not send report.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    const token = needToken();
    if (!token) return;
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await withdrawTrack(track.id, token);
      const wall = track.artistSlugs?.[0];
      router.push(wall ? `/artists/${wall}` : "/app");
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not remove the production.");
      setBusy(false);
    }
  }

  return (
    <>
      {owner ? (
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void onRemove()}>
          {confirm ? "Confirm remove" : "Remove"}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setReporting(true);
            setNotice(null);
            setError(null);
          }}
        >
          Report
        </button>
      )}
      {reporting ? (
        <form className="tracks__report" onSubmit={onReport}>
          <label className="field">
            <span>Why are you reporting this production?</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </label>
          <div className="wall__actions">
            <button type="submit" className="btn" disabled={busy}>
              Send report
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setReporting(false);
                setReason("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="note note--err">{error}</p> : null}
      {notice ? <p className="note note--ok">{notice}</p> : null}
    </>
  );
}
