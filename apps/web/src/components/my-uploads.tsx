"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { listMyTracks } from "@/lib/catalog";
import { useSessionToken } from "@/lib/session";
import { toProdRow, type ProdRow } from "@/lib/types";
import { TrackList } from "./track-list";

export function MyUploads() {
  const token = useSessionToken();
  const [rows, setRows] = useState<ProdRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyTracks(token, 50);
        if (cancelled) return;
        setRows(
          list.tracks.map((t) => {
            const wall = t.artist_slugs?.[0];
            return {
              ...toProdRow(t, {
                meta: wall ?? "Single",
                metaHref: wall ? `/artists/${wall}` : undefined,
              }),
              readOnly: t.status === "removed",
            };
          }),
        );
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(isApiRequestError(err) ? err.message : "Could not load your uploads.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="am-page">
        <h1>My uploads</h1>
        <p className="hint">
          <Link href="/login?next=%2Flibrary">Sign in</Link> to see what you uploaded.
        </p>
      </div>
    );
  }

  if (rows === null && !error) {
    return (
      <div className="am-page">
        <h1>My uploads</h1>
        <p className="hint">Loading…</p>
      </div>
    );
  }

  const published = rows?.filter((t) => t.status !== "removed") ?? [];
  const removed = rows?.filter((t) => t.status === "removed") ?? [];

  return (
    <div className="am-page">
      <h1>My uploads</h1>
      <p className="hint">
        Everything you sent to a wall. Removed uploads stay listed but cannot be restored.
      </p>

      <section className="am-shelf">
        <h2>Published · {published.length}</h2>
        <TrackList tracks={published} loadError={error} />
      </section>

      {removed.length > 0 ? (
        <section className="am-shelf">
          <h2>Removed · {removed.length}</h2>
          <p className="hint">The audio and cover were deleted when you withdrew these.</p>
          <TrackList tracks={removed} />
        </section>
      ) : null}
    </div>
  );
}
