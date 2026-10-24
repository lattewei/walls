"use client";

import { useMemo } from "react";

import type { ProdRow } from "@/lib/types";
import { useSessionUser } from "@/lib/session";
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
  const user = useSessionUser();
  const owner = user?.handle === handle;
  const rows = useMemo(
    () => tracks.map((t) => ({ ...t, canWithdraw: owner })),
    [tracks, owner],
  );

  return <ProdList tracks={rows} loadError={loadError} />;
}
