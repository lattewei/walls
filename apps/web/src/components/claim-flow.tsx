"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getArtistForSession, listMyClaims, requestClaim, updateClaimProof } from "@/lib/catalog";
import { useSessionToken } from "@/lib/session";
import type { Claim, PublicArtist } from "@/lib/types";

export function ClaimFlow({
  slug,
  name,
  claimStatus,
}: {
  slug: string;
  name: string;
  claimStatus: string;
}) {
  const token = useSessionToken();
  const [artist, setArtist] = useState<PublicArtist | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [rejected, setRejected] = useState(false);
  const [identity, setIdentity] = useState("");
  const [proof, setProof] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = Boolean(token) && loadedFor !== token;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [wall, claims] = await Promise.all([
          getArtistForSession(slug, token),
          listMyClaims(token, 50),
        ]);
        if (cancelled) return;
        setArtist(wall);
        const mine = claims.claims.filter((c) => c.artist_slug === slug);
        const active =
          mine.find((c) => c.status === "pending") ??
          mine.find((c) => c.status === "accepted") ??
          null;
        setClaim(active);
        setRejected(!active && mine.some((c) => c.status === "rejected"));
        if (active?.identity_url) setIdentity(active.identity_url);
        if (active?.proof_url) setProof(active.proof_url);
      } catch (err) {
        if (!cancelled) {
          setError(isApiRequestError(err) ? err.message : "Could not load this wall.");
        }
      } finally {
        if (!cancelled) setLoadedFor(token);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  async function onStart(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { claim: created } = await requestClaim(slug, token, identity.trim(), proof.trim());
      setClaim(created);
      if (created.identity_url) setIdentity(created.identity_url);
      if (created.proof_url) setProof(created.proof_url);
      setRejected(false);
      setNotice("Claim code ready. Publish it, then paste the link below.");
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not start the claim.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProof(e: FormEvent) {
    e.preventDefault();
    if (!token || !claim) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { claim: updated } = await updateClaimProof(claim.id, proof.trim(), token);
      setClaim(updated);
      setNotice("Proof saved. An admin will review the claim.");
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not save the proof link.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!claim) return;
    try {
      await navigator.clipboard.writeText(claim.claim_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy. Select the code manually.");
    }
  }

  const accepted = claim?.status === "accepted";
  const canEdit = Boolean(artist?.can_edit);

  return (
    <div className="sheet">
      <h1>Claim {name}</h1>

      {loading ? (
        <p className="hint">Checking this wall…</p>
      ) : !token ? (
        <>
          <p className="hint">
            Log in to prove you run this artist page. You publish a short code from the official
            account, then an admin reviews it.
          </p>
          <p>
            <Link
              href={`/login?next=${encodeURIComponent(`/artists/${slug}/claim`)}`}
              className="btn"
            >
              Log in to claim
            </Link>
          </p>
        </>
      ) : accepted || (claimStatus === "claimed" && canEdit) ? (
        <>
          <p className="hint">
            This wall is claimed. You can edit its bio, genres, cover, and looking-for line.
          </p>
          <p>
            <Link href={`/artists/${slug}/edit`} className="btn">
              Edit this wall
            </Link>
          </p>
        </>
      ) : claimStatus === "claimed" ? (
        <p className="hint">
          This wall is already claimed by another account. If that is a mistake, report the wall
          from its page.
        </p>
      ) : (
        <>
          <p className="hint">
            Claims are verified with a public code, not an email. The code proves you control the
            artist&apos;s official account.
          </p>

          {rejected ? (
            <p className="note">Your previous claim was rejected. You can start a new one.</p>
          ) : null}

          {!claim ? (
            <form onSubmit={onStart}>
              <label className="field">
                <span>Official account URL</span>
                <input
                  type="url"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="https://instagram.com/artist"
                  required
                  maxLength={500}
                />
                <span className="field__help">
                  The account that posts for this artist (Instagram, X, TikTok, or their own site).
                </span>
              </label>
              <button
                type="submit"
                className="btn"
                disabled={busy || identity.trim().length === 0}
              >
                {busy ? "Creating…" : "Get claim code"}
              </button>
            </form>
          ) : (
            <div>
              <ol className="claim__steps">
                <li>Account submitted</li>
                <li className="is-active">Publish the code</li>
                <li>Admin review</li>
              </ol>

              <span className="field__help">Your code</span>
              <code className="claim__code">{claim.claim_code}</code>
              <button type="button" className="btn btn--text" onClick={copyCode}>
                {copied ? "Copied" : "Copy"}
              </button>

              <p className="hint">
                Publish this code from{" "}
                {claim.identity_url ? (
                  <a href={claim.identity_url} rel="noreferrer" target="_blank">
                    {claim.identity_url}
                  </a>
                ) : (
                  "your official account"
                )}{" "}
                (bio, story, or pinned post). Then paste the link to that post here.
              </p>

              <form onSubmit={onSaveProof}>
                <label className="field">
                  <span>Link to the public post</span>
                  <input
                    type="url"
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder="https://instagram.com/p/abc"
                    required
                    maxLength={500}
                  />
                </label>
                <button
                  type="submit"
                  className="btn"
                  disabled={busy || proof.trim().length === 0}
                >
                  {busy ? "Saving…" : claim.proof_url ? "Update proof" : "Submit proof"}
                </button>
              </form>

              <p className="field__help">
                Status: {claim.status}
                {claim.proof_url ? " · proof on file" : " · waiting for proof"}
              </p>
            </div>
          )}
        </>
      )}

      {canEdit && !accepted ? (
        <p>
          <Link href={`/artists/${slug}/edit`} className="btn">
            Edit this wall
          </Link>
        </p>
      ) : null}

      {error ? <p className="note note--err">{error}</p> : null}
      {notice ? <p className="note note--ok">{notice}</p> : null}

      <p className="alt">
        <Link href={`/artists/${slug}`}>Back to the wall</Link>
      </p>
    </div>
  );
}
