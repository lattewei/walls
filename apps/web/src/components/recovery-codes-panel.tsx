"use client";

import { useEffect, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { regenerateRecoveryCodes } from "@/lib/auth";
import { getMe } from "@/lib/catalog";
import { useSessionToken } from "@/lib/session";

export function RecoveryCodesPanel() {
  const token = useSessionToken();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe(token);
        if (!cancelled) setRemaining(me.recovery_codes_remaining ?? 0);
      } catch {
        if (!cancelled) setRemaining(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onGenerate() {
    if (!token) return;
    if (
      remaining !== null &&
      remaining > 0 &&
      !confirm("Generate new codes? The codes you saved before will stop working.")
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await regenerateRecoveryCodes(token);
      setCodes(res.recovery_codes);
      setRemaining(res.remaining);
      setNotice("New codes generated. Save them now.");
    } catch (err) {
      setError(
        isApiRequestError(err) ? err.message : "Could not generate recovery codes.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyCodes() {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
    } catch {
      setError("Could not copy. Select the codes and copy them manually.");
    }
  }

  return (
    <section className="settings-codes">
      <h2>Recovery codes</h2>
      <p className="hint">
        {remaining === null
          ? "Checking how many codes you have left…"
          : remaining > 0
            ? `${remaining} unused code${remaining === 1 ? "" : "s"}. Each one resets your password once.`
            : "You have no unused codes. Generate a new set so you can recover your account."}
      </p>

      {codes ? (
        <>
          <ul className="codes">
            {codes.map((value) => (
              <li key={value}>
                <code>{value}</code>
              </li>
            ))}
          </ul>
          <div className="wall__actions">
            <button type="button" className="btn btn--ghost" onClick={copyCodes}>
              Copy all
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setCodes(null)}>
              Hide codes
            </button>
          </div>
        </>
      ) : null}

      {error ? <p className="note note--err">{error}</p> : null}
      {notice ? <p className="note note--ok">{notice}</p> : null}

      <button type="button" className="btn" onClick={onGenerate} disabled={busy || !token}>
        {busy ? "Generating…" : "Generate new codes"}
      </button>
    </section>
  );
}
