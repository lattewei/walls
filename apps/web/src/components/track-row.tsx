"use client";

import { Pause, Play } from "@phosphor-icons/react";
import Link from "next/link";

import { usePlayer } from "@/lib/player";
import type { PublicTrack } from "@/lib/types";

export function TrackRow({ track }: { track: PublicTrack }) {
  const { current, playing, play, toggle } = usePlayer();
  const isCurrent = current?.id === track.id;
  const isPlaying = isCurrent && playing;

  return (
    <div className="group flex items-center gap-3 border-b border-zinc-900 py-3 last:border-0">
      <button
        type="button"
        disabled={!track.audio_url}
        onClick={() => {
          if (isCurrent) toggle();
          else play(track);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-200 transition hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-40"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause weight="fill" className="h-4 w-4" />
        ) : (
          <Play weight="fill" className="h-4 w-4 translate-x-px" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-100">
          {track.title}
        </div>
        <div className="truncate text-xs text-zinc-500">
          {track.uploader_handle ? (
            <Link
              href={`/u/${track.uploader_handle}`}
              className="hover:text-zinc-300"
            >
              @{track.uploader_handle}
            </Link>
          ) : (
            "Unknown"
          )}
          {track.tags?.length ? (
            <span className="text-zinc-600">
              {" · "}
              {track.tags.slice(0, 3).join(", ")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="hidden text-xs text-zinc-600 sm:block">
        {track.audio_format?.toUpperCase()}
      </div>
    </div>
  );
}
