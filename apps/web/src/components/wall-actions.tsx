"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { hideAdminArtist } from "@/lib/admin";
import { isApiRequestError } from "@/lib/api";
import { getArtistForSession, listMyClaims, reportTarget } from "@/lib/catalog";
import { useSessionToken, useSessionUser } from "@/lib/session";
import type { Claim } from "@/lib/types";

export function WallActions({
  slug,
  official,
}: {
  slug: string;
  official: boolean;
}) {
  const router = useRouter();
  const token = useSessionToken();
  const user = useSessionUser();
  const [artistId, setArtistId] = useState<string | null>(null);
  const [canEditState, setCanEditState] = useState(false);
  const [pendingState, setPendingState] = useState<Claim | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [confirmHide, setConfirmHide] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = !token || loadedFor === token;
  const canEdit = Boolean(token) && ready && canEditState;
  const pending = token && ready ? pendingState : null;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [artist, claims] = await Promise.all([
          getArtistForSession(slug, token),
          listMyClaims(token, 50),
        ]);
        if (cancelled) return;
        setArtistId(artist?.id ?? null);
        setCanEditState(Boolean(artist?.can_edit));
        setPendingState(
          claims.claims.find(
            (c) => c.artist_slug === slug && c.status === "pending",
          ) ?? null,
        );
      } catch {
        if (!cancelled) {
          setArtistId(null);
          setCanEditState(false);
          setPendingState(null);
        }
      } finally {
        if (!cancelled) setLoadedFor(token);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  async function onHide() {
    if (!token) return;
    if (!confirmHide) {
      setConfirmHide(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await hideAdminArtist(slug, token);
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not hide the wall.");
      setBusy(false);
    }
  }

  async function onReport(e: FormEvent) {
    e.preventDefault();
    if (!token || !artistId) return;
    setBusy(true);
    setError(null);
    try {
      await reportTarget(token, "artist", artistId, reason.trim(), "");
      setReporting(false);
      setReason("");
      setNotice("Report sent.");
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not send report.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  const claimHref = token
    ? `/artists/${slug}/claim`
    : `/login?next=${encodeURIComponent(`/artists/${slug}/claim`)}`;

  return (
    <>
      {canEdit ? (
        <Link href={`/artists/${slug}/edit`} className="btn">
          Edit wall
        </Link>
      ) : null}
      {pending ? (
        <Link href={`/artists/${slug}/claim`} className="btn btn--ghost">
          Claim pending
        </Link>
      ) : null}
      {!canEdit && !official && !pending ? (
        <Link href={claimHref} className="btn btn--ghost">
          Claim this wall
        </Link>
      ) : null}
      {token && artistId && !reporting ? (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setReporting(true);
            setNotice(null);
            setError(null);
          }}
        >
          Report wall
        </button>
      ) : null}
      {isAdmin ? (
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() => void onHide()}
        >
          {confirmHide ? "Confirm hide" : "Hide wall"}
        </button>
      ) : null}
      {reporting ? (
        <form className="tracks__report" onSubmit={onReport}>
          <label className="field">
            <span>Why are you reporting this wall?</span>
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

export function EditProfileLink({ handle }: { handle: string }) {
  const user = useSessionUser();
  if (!user || user.handle !== handle) return null;
  return (
    <Link href="/settings" className="btn btn--ghost">
      Edit profile
    </Link>
  );
}
