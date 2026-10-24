"use client";

import { useEffect, useMemo, useState } from "react";

import { getToken } from "@/lib/auth";
import { getMe } from "@/lib/catalog";
import type { ProdRow } from "@/lib/types";
import { ProdList } from "@/components/studio/prod-list";

export function ProfileTracks({
  handle,
  tracks,
  loadError,
}: {
  handle: string;
  tracks: ProdRow[];
  loadError?: string | null;
}) {
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setOwner(false);
      return;
    }
    let cancelled = false;
    getMe(token)
      .then((me) => {
        if (!cancelled) setOwner(me.user.handle === handle);
      })
      .catch(() => {
        if (!cancelled) setOwner(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const rows = useMemo(
    () => tracks.map((t) => ({ ...t, canWithdraw: owner })),
    [tracks, owner],
  );

  return <ProdList tracks={rows} loadError={loadError} />;
}
