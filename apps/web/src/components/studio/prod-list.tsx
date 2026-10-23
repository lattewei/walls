"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { withdrawTrack } from "@/lib/catalog";
import type { ProdRow } from "@/lib/types";
import { formatDuration } from "@/lib/types";
import { usePlayer } from "./player-context";
import { IconPause, IconPlay } from "./icons";

export function ProdList({ tracks }: { tracks: ProdRow[] }) {
  const player = usePlayer();
  const router = useRouter();
  const [rows, setRows] = useState(tracks);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(tracks);
  }, [tracks]);

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, number> = {};

    rows.forEach((track) => {
      if (!track.audioUrl) return;
      if (track.durationSeconds && track.durationSeconds > 0) {
        next[track.id] = track.durationSeconds;
        return;
      }
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = track.audioUrl;
      audio.onloadedmetadata = () => {
        if (cancelled) return;
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setDurations((prev) =>
            prev[track.id] === audio.duration ? prev : { ...prev, [track.id]: audio.duration },
          );
        }
      };
    });

    if (Object.keys(next).length) {
      setDurations((prev) => ({ ...next, ...prev }));
    }

    return () => {
      cancelled = true;
    };
  }, [rows]);

  async function onWithdraw(trackId: string) {
    const token = getToken();
    if (!token) return;
    if (!window.confirm("Remove this production from Walls?")) return;

    setError(null);
    setBusyId(trackId);
    try {
      await withdrawTrack(trackId, token);
      setRows((prev) => prev.filter((t) => t.id !== trackId));
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
          const seconds =
            durations[track.id] ??
            track.durationSeconds ??
            (active && player.duration > 0 ? player.duration : null);

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
                </span>
                <span className="prod__dur">{formatDuration(seconds)}</span>
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
