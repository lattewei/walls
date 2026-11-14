"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { recover } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export function RecoverForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session = await recover(handle.trim(), code, password);
      setCodes(session.recovery_codes ?? []);
    } catch (err) {
      setError(
        isApiRequestError(err)
          ? err.message
          : err instanceof Error && err.message
            ? err.message
            : "Could not reset the password. Try again.",
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

  if (codes) {
    return (
      <div className="auth">
        <div>
          <h1>Password reset</h1>
          <p className="hint">
            Your old codes no longer work. Save these new recovery codes, then log in with
            your new password.
          </p>
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
            <button
              type="button"
              className="btn"
              onClick={() => {
                router.push(safeNext(null));
                router.refresh();
              }}
            >
              Continue
            </button>
          </div>
          {error ? <p className="note note--err">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <Link href="/login" className="auth__back">
        Back
      </Link>
      <form onSubmit={onSubmit}>
        <h1>Recover account</h1>
        <p className="hint">
          Use one of the recovery codes you saved when you created your account. It works
          once.
        </p>

        <label className="field">
          <span>Handle</span>
          <input
            name="handle"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="kay_beats"
            required
            minLength={3}
            maxLength={32}
          />
        </label>

        <label className="field">
          <span>Recovery code</span>
          <input
            name="code"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXXX-XXXXX"
            required
          />
        </label>

        <label className="field">
          <span>New password</span>
          <input
            name="new_password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={72}
          />
        </label>

        {error ? <p className="note note--err">{error}</p> : null}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "…" : "Reset password"}
        </button>

        <p className="alt">
          <Link href="/login">Back to log in</Link>
        </p>
      </form>
    </div>
  );
}
