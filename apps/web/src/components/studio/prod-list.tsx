"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ProdRow } from "@/lib/types";
import { formatDuration } from "@/lib/types";
import { usePlayer } from "./player-context";
import { IconPause, IconPlay } from "./icons";

export function ProdList({ tracks }: { tracks: ProdRow[] }) {
  const player = usePlayer();
  const [durations, setDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, number> = {};

    tracks.forEach((track) => {
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
  }, [tracks]);

  if (tracks.length === 0) {
    return <p className="prods__empty">No productions yet</p>;
  }

  return (
    <ul className="prods__list">
      {tracks.map((track, i) => {
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
                  player.playQueue(tracks, track.id);
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
