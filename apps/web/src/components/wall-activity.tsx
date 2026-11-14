"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { listWallActivity } from "@/lib/catalog";
import { useSessionToken } from "@/lib/session";
import { toProdRow, type ProdRow } from "@/lib/types";
import { TrackList } from "./track-list";

export const ACTIVITY_SEEN_KEY = "walls_activity_seen";

type WallGroup = { slug: string; name: string; rows: ProdRow[] };

export function WallActivity() {
  const token = useSessionToken();
  const [groups, setGroups] = useState<WallGroup[] | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const seenRaw = localStorage.getItem(ACTIVITY_SEEN_KEY);
      const seenAt = seenRaw ? Date.parse(seenRaw) : 0;
      try {
        const res = await listWallActivity(token, undefined, 50);
        if (cancelled) return;

        const fresh = res.items.filter(
          (item) => Date.parse(item.track.created_at) > seenAt,
        ).length;
        setUnseen(fresh);

        const byWall = new Map<string, WallGroup>();
        for (const item of res.items) {
          const group = byWall.get(item.artist_slug) ?? {
            slug: item.artist_slug,
            name: item.artist_name,
            rows: [],
          };
          group.rows.push(
            toProdRow(item.track, {
              meta: item.artist_name,
              metaHref: `/artists/${item.artist_slug}`,
            }),
          );
          byWall.set(item.artist_slug, group);
        }
        setGroups(Array.from(byWall.values()));
        setError(null);
        localStorage.setItem(ACTIVITY_SEEN_KEY, new Date().toISOString());
      } catch (err) {
        if (cancelled) return;
        setError(isApiRequestError(err) ? err.message : "Could not load wall activity.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="am-page">
        <h1>Wall activity</h1>
        <p className="hint">
          <Link href="/login?next=%2Factivity">Sign in</Link> to follow the walls you claimed.
        </p>
      </div>
    );
  }

  if (groups === null && !error) {
    return (
      <div className="am-page">
        <h1>Wall activity</h1>
        <p className="hint">Loading…</p>
      </div>
    );
  }

  return (
    <div className="am-page">
      <h1>Wall activity</h1>
      <p className="hint">
        {unseen > 0
          ? `${unseen} new production${unseen === 1 ? "" : "s"} since your last visit.`
          : "New productions on the walls you claimed, last 7 days."}
      </p>

      {error ? <p className="note note--err">{error}</p> : null}
      {groups && groups.length === 0 && !error ? (
        <p className="note note--empty">Nothing new on your walls yet.</p>
      ) : null}

      {groups?.map((group) => (
        <section className="am-shelf" key={group.slug}>
          <h2>
            <Link href={`/artists/${group.slug}`}>{group.name}</Link>
          </h2>
          <TrackList tracks={group.rows} />
        </section>
      ))}
    </div>
  );
}
