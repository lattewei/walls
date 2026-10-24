"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { reportTarget, withdrawTrack } from "@/lib/catalog";
import type { ProdRow } from "@/lib/types";
import { formatDuration } from "@/lib/types";
import { usePlayer } from "./player-context";
import { IconPause, IconPlay } from "./icons";

export function ProdList({
  tracks,
  loadError,
}: {
  tracks: ProdRow[];
  loadError?: string | null;
}) {
  const player = usePlayer();
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = tracks.filter((t) => !hidden.has(t.id));

  async function onWithdraw(trackId: string) {
    const token = getToken();
    if (!token) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!window.confirm("Remove this production from Walls?")) return;

    setError(null);
    setBusyId(trackId);
    try {
      await withdrawTrack(trackId, token);
      setHidden((prev) => new Set(prev).add(trackId));
      if (player.track?.id === trackId) {
        player.pause();
      }
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not remove track.");
    } finally {
      setBusyId(null);
    }
  }

  async function onReport(trackId: string) {
    const token = getToken();
    if (!token) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    const reason = window.prompt("Why are you reporting this production?");
    if (!reason || !reason.trim()) return;
    setError(null);
    try {
      await reportTarget(token, "track", trackId, reason.trim(), "");
      setError("Report sent.");
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not send report.");
    }
  }

  if (loadError) {
    return <p className="prods__err">{loadError}</p>;
  }

  if (rows.length === 0) {
    return <p className="prods__empty">No productions yet</p>;
  }

  return (
    <>
      {error ? <p className="prods__err">{error}</p> : null}
      <ul className="prods__list">
        {rows.map((track, i) => {
          const active = player.track?.id === track.id;
          const playing = active && player.playing;
          const canPlay = Boolean(track.audioUrl);
          const seconds = track.durationSeconds ?? (active && player.duration > 0 ? player.duration : null);

          return (
            <li key={track.id}>
              <div className={active ? "prod is-on" : "prod"}>
                <button
                  type="button"
                  className="prod__play"
                  disabled={!canPlay}
                  onClick={() => {
                    if (active) {
                      player.toggle();
                      return;
                    }
                    player.playQueue(rows, track.id);
                  }}
                  aria-label={
                    !canPlay
                      ? `${track.title} not ready`
                      : playing
                        ? "Pause"
                        : `Play ${track.title}`
                  }
                >
                  {playing ? <IconPause size={12} /> : <IconPlay size={12} />}
                </button>
                <span className="prod__n" aria-hidden>
                  {active && playing ? "" : i + 1}
                </span>
                <span className="prod__copy">
                  <strong>{track.title}</strong>
                  {track.metaHref ? (
                    <Link href={track.metaHref} className="prod__meta">
                      {track.meta}
                    </Link>
                  ) : (
                    <em>{track.meta}</em>
                  )}
                  {track.detail ? <em className="prod__detail">{track.detail}</em> : null}
                </span>
                <span className="prod__dur">{formatDuration(seconds)}</span>
                <button type="button" className="prod__rm" onClick={() => onReport(track.id)}>
                  Report
                </button>
                {track.canWithdraw ? (
                  <button
                    type="button"
                    className="prod__rm"
                    disabled={busyId === track.id}
                    onClick={() => onWithdraw(track.id)}
                  >
                    {busyId === track.id ? "…" : "Remove"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
