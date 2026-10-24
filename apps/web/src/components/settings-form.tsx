"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken, getStoredUser, updateStoredUser } from "@/lib/auth";
import { getMe, updateMe, uploadAvatar } from "@/lib/catalog";

export function SettingsForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [extraLinks, setExtraLinks] = useState<{ label: string; url: string }[]>([]);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (!token || !stored) {
      router.replace("/login?next=/settings");
      return;
    }
    setHandle(stored.handle);
    setDisplayName(stored.display_name);
    (async () => {
      try {
        const me = await getMe(token);
        setDisplayName(me.user.display_name || stored.display_name);
        setBio(me.user.bio ?? "");
        setAvatarUrl(me.user.avatar_url ?? null);
        setEmail(me.contacts.public_contact_email ?? "");
        setInstagram(me.contacts.instagram_url ?? "");
        const links = me.contacts.other_links ?? [];
        const [first, ...rest] = links;
        if (first) {
          setLinkLabel(first.label);
          setLinkUrl(first.url);
        }
        setExtraLinks(rest);
        setLoaded(true);
      } catch {
        setError("Could not load your profile. Refresh before saving, or your contacts may be overwritten.");
      } finally {
        setReady(true);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!avatarFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

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

      const firstLink =
        linkLabel.trim() && linkUrl.trim()
          ? [{ label: linkLabel.trim(), url: linkUrl.trim() }]
          : [];
      const other_links = [...firstLink, ...extraLinks];

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

  if (!ready) {
    return (
      <div className="wall-form">
        <p className="wall-form__hint">Loading…</p>
      </div>
    );
  }

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
                  // eslint-disable-next-line @next/next/no-img-element -- blob or API avatar, not an optimizer source
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

          <label className="auth__field">
            <span>Other link label</span>
            <input
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="SoundCloud"
              maxLength={40}
            />
          </label>

          <label className="auth__field">
            <span>Other link URL</span>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://soundcloud.com/you"
            />
          </label>

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
