"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken, updateStoredUser } from "@/lib/auth";
import { getMe, updateMe, uploadAvatar } from "@/lib/catalog";
import { useSessionToken, useSessionUser } from "@/lib/session";

export function SettingsForm() {
  const router = useRouter();
  const token = useSessionToken();
  const stored = useSessionUser();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [links, setLinks] = useState<{ label: string; url: string }[]>([{ label: "", url: "" }]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const preview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  );

  useEffect(() => {
    if (!token || !stored) {
      router.replace("/login?next=/settings");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe(token);
        if (cancelled) return;
        setDisplayName(me.user.display_name || stored.display_name);
        setBio(me.user.bio ?? "");
        setAvatarUrl(me.user.avatar_url ?? null);
        setEmail(me.contacts.public_contact_email ?? "");
        setInstagram(me.contacts.instagram_url ?? "");
        const other = me.contacts.other_links ?? [];
        setLinks(other.length ? other : [{ label: "", url: "" }]);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setError("Could not load your profile. Refresh before saving, or your contacts may be overwritten.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, token, stored]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    if (!loaded) {
      setError("Profile did not load. Refresh before saving.");
      return;
    }

    setBusy(true);
    try {
      if (avatarFile) {
        if (avatarFile.size > 5 * 1024 * 1024) {
          throw new Error("Avatar must be under 5MB");
        }
        const user = await uploadAvatar(avatarFile, token);
        setAvatarUrl(user.avatar_url ?? null);
        setAvatarFile(null);
      }

      const other_links = links
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.label && l.url);

      const res = await updateMe(
        {
          display_name: displayName.trim(),
          bio: bio.trim(),
          public_contact_email: email.trim() === "" ? null : email.trim(),
          instagram_url: instagram.trim() === "" ? null : instagram.trim(),
          other_links,
        },
        token,
      );

      updateStoredUser({
        display_name: res.user.display_name,
        handle: res.user.handle,
      });
      if (res.user.avatar_url) setAvatarUrl(res.user.avatar_url);
      setOk("Saved.");
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!token || !stored) {
    return (
      <div className="wall-form">
        <p className="wall-form__hint">Loading…</p>
      </div>
    );
  }

  const handle = stored.handle;
  const shown = preview || avatarUrl;
  const initial = displayName.slice(0, 1).toUpperCase() || handle.slice(0, 1).toUpperCase() || "?";

  return (
    <div className="wall-form">
      <div className="wall-form__inner">
        <h1>Edit profile</h1>
        <p className="wall-form__hint">
          Public info on your producer page. @{handle}
        </p>

        <form onSubmit={onSubmit}>
          <label className="auth__field">
            <span>Profile photo</span>
            <div className="wall-form__cover wall-form__cover--round">
              <div className="wall-form__preview wall-form__preview--round" aria-hidden>
                {shown ? (
                  <img src={shown} alt="" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    setError("Avatar must be under 5MB");
                    setAvatarFile(null);
                    return;
                  }
                  setError(null);
                  setAvatarFile(file);
                }}
              />
            </div>
          </label>

          <label className="auth__field">
            <span>Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={64}
            />
          </label>

          <label className="auth__field">
            <span>Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What you make, where you're based…"
            />
          </label>

          <label className="auth__field">
            <span>Public contact email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </label>

          <label className="auth__field">
            <span>Instagram URL</span>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/you"
            />
          </label>

          {links.map((link, i) => (
            <div key={i} className="settings__link">
              <label className="auth__field">
                <span>{i === 0 ? "Other link label" : `Link ${i + 1} label`}</span>
                <input
                  value={link.label}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...next[i], label: e.target.value };
                    setLinks(next);
                  }}
                  placeholder="SoundCloud"
                  maxLength={40}
                />
              </label>
              <label className="auth__field">
                <span>{i === 0 ? "Other link URL" : `Link ${i + 1} URL`}</span>
                <input
                  value={link.url}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...next[i], url: e.target.value };
                    setLinks(next);
                  }}
                  placeholder="https://soundcloud.com/you"
                />
              </label>
              {links.length > 1 ? (
                <button
                  type="button"
                  className="prod__rm"
                  onClick={() => setLinks(links.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {links.length < 10 ? (
            <button
              type="button"
              className="settings__add-link"
              onClick={() => setLinks([...links, { label: "", url: "" }])}
            >
              Add another link
            </button>
          ) : null}

          {error ? <p className="auth__error">{error}</p> : null}
          {ok ? <p className="settings__ok">{ok}</p> : null}

          <button type="submit" className="auth__submit" disabled={busy || !loaded}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>

        <p className="auth__alt">
          <Link href={`/users/${handle}`}>View public page</Link>
        </p>
      </div>
    </div>
  );
}
