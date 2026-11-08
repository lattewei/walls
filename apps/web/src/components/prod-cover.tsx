"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { setTrackCover } from "@/lib/catalog";
import { useSessionUser } from "@/lib/session";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

export function ProdCover({
  trackId,
  coverUrl,
  title,
  uploaderHandle,
  canReplace,
}: {
  trackId: string;
  coverUrl?: string;
  title: string;
  uploaderHandle?: string;
  canReplace: boolean;
}) {
  const router = useRouter();
  const user = useSessionUser();
  const owner = Boolean(canReplace && user?.handle && uploaderHandle === user.handle);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const shown = preview || coverUrl;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onPick(next: File | null) {
    if (!next) return;
    const token = getToken();
    if (!token) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (next.size > MAX_COVER_BYTES) {
      setError("Cover must be under 5MB.");
      return;
    }
    setFile(next);
    setBusy(true);
    setError(null);
    try {
      await setTrackCover(trackId, next, token);
      router.refresh();
    } catch (err) {
      setFile(null);
      setError(isApiRequestError(err) ? err.message : "Could not update the cover.");
    } finally {
      setBusy(false);
    }
  }

  const face = (
    <div className={owner ? "am-detail__cover is-edit" : "am-detail__cover"}>
      {shown ? (
        <img src={shown} alt="" />
      ) : (
        <span aria-hidden>{title.slice(0, 1).toUpperCase()}</span>
      )}
      {owner ? (
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          disabled={busy}
          aria-label="Change cover"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            e.target.value = "";
            void onPick(picked);
          }}
        />
      ) : null}
    </div>
  );

  return (
    <div className="prod-cover">
      {owner ? <label className="prod-cover__hit">{face}</label> : face}
      {owner ? (
        <p className="field__help">{busy ? "Saving…" : "Click the artwork to change the cover."}</p>
      ) : null}
      {error ? <p className="note note--err">{error}</p> : null}
    </div>
  );
}
