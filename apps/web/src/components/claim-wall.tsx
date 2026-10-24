"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { requestClaim } from "@/lib/catalog";

export function ClaimWall({ slug, official }: { slug: string; official: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("social");
  const [proof, setProof] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (official || done) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(`/artists/${slug}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestClaim(slug, token, method, proof.trim());
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not send the claim.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="profile__action profile__action--ghost" onClick={() => setOpen(true)}>
        Claim this wall
      </button>
    );
  }

  return (
    <form className="auth__card" onSubmit={onSubmit}>
      <label className="auth__field">
        <span>How can we verify you?</span>
        <input value={method} onChange={(e) => setMethod(e.target.value)} required maxLength={100} />
      </label>
      <label className="auth__field">
        <span>Proof URL</span>
        <input
          type="url"
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="https://"
          required
          maxLength={500}
        />
      </label>
      {error ? <p className="auth__error">{error}</p> : null}
      <button type="submit" className="auth__submit" disabled={busy}>
        {busy ? "…" : "Send claim"}
      </button>
    </form>
  );
}
