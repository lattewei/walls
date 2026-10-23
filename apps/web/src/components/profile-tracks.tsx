"use client";

import { useEffect, useMemo, useState } from "react";

import { getStoredUser } from "@/lib/auth";
import type { ProdRow } from "@/lib/types";
import { ProdList } from "@/components/studio/prod-list";

export function ProfileTracks({
  handle,
  tracks,
}: {
  handle: string;
  tracks: ProdRow[];
}) {
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setOwner(Boolean(u && u.handle === handle));
  }, [handle]);

  const rows = useMemo(
    () => tracks.map((t) => ({ ...t, canWithdraw: owner })),
    [tracks, owner],
  );

  return <ProdList tracks={rows} />;
}
