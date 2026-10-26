"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getArtistForSession, listMyClaims } from "@/lib/catalog";
import { useSessionToken } from "@/lib/session";
import type { Claim } from "@/lib/types";

export function WallAdminActions({
  slug,
  official,
}: {
  slug: string;
  official: boolean;
}) {
  const token = useSessionToken();
  const [canEditState, setCanEditState] = useState(false);
  const [pendingState, setPendingState] = useState<Claim | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const ready = !token || loadedFor === token;
  const canEdit = Boolean(token) && ready && canEditState;
  const pending = token && ready ? pendingState : null;

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
        setCanEditState(Boolean(artist?.can_edit));
        setPendingState(
          claims.claims.find(
            (c) => c.artist_slug === slug && c.status === "pending",
          ) ?? null,
        );
      } catch {
        if (!cancelled) {
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

  if (!ready) return null;
  if (official && !canEdit) return null;
  if (!canEdit && pending) {
    return (
      <Link
        href={`/artists/${slug}/claim`}
        className="profile__action profile__action--ghost"
      >
        Claim pending
      </Link>
    );
  }
  if (!canEdit && !official) {
    const href = token
      ? `/artists/${slug}/claim`
      : `/login?next=${encodeURIComponent(`/artists/${slug}/claim`)}`;
    return (
      <Link href={href} className="profile__action profile__action--ghost">
        Claim this wall
      </Link>
    );
  }
  if (!canEdit) return null;

  return (
    <>
      <Link href={`/artists/${slug}/edit`} className="profile__action">
        Edit wall
      </Link>
      {pending ? (
        <Link
          href={`/artists/${slug}/claim`}
          className="profile__action profile__action--ghost"
        >
          Claim pending
        </Link>
      ) : null}
    </>
  );
}
