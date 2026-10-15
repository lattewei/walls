"use client";

import { Pause, Play } from "@phosphor-icons/react";
import Link from "next/link";

import { usePlayer } from "@/lib/player";
import type { PublicTrack } from "@/lib/types";
import { Sleeve } from "./sleeve";

export function TrackRow({
  track,
  index,
}: {
  track: PublicTrack;
  index: number;
}) {
  const { current, playing, play, toggle } = usePlayer();
  const active = current?.id === track.id;
  const isPlaying = active && playing;

  return (
    <div className="group flex items-center gap-3 border-b border-[var(--line)] py-2.5 last:border-0">
      <button
        type="button"
        disabled={!track.audio_url}
        onClick={() => (active ? toggle() : play(track))}
        aria-label={isPlaying ? "Pause" : `Play ${track.title}`}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center text-[var(--ink-3)]"
      >
        <span className="font-mono text-xs group-hover:opacity-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="absolute inset-0 hidden items-center justify-center rounded-full bg-[var(--ink)] text-[var(--bg)] group-hover:flex">
          {isPlaying ? (
            <Pause weight="fill" className="h-3.5 w-3.5" />
          ) : (
            <Play weight="fill" className="ml-px h-3.5 w-3.5" />
          )}
        </span>
      </button>
      <Sleeve seed={track.id} className="h-11 w-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--ink)]">{track.title}</div>
        <div className="truncate text-xs text-[var(--ink-3)]">
          {track.uploader_handle ? (
            <Link href={`/u/${track.uploader_handle}`} className="hover:text-[var(--ink)]">
              @{track.uploader_handle}
            </Link>
          ) : (
            "Unknown"
          )}
          {track.tags?.length ? `  ·  ${track.tags.slice(0, 2).join(" · ")}` : ""}
        </div>
      </div>
      <span className="hidden text-[11px] uppercase tracking-wider text-[var(--ink-3)] sm:block">
        {track.audio_format ?? ""}
      </span>
    </div>
  );
}
