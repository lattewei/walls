"use client";

import { Pause, Play } from "@phosphor-icons/react";
import Link from "next/link";

import { formatTime, usePlayer } from "@/lib/player";

export function PlayerBar() {
  const { current, playing, progress, duration, toggle, seek } = usePlayer();

  if (!current) return null;

  const ratio = duration > 0 ? progress / duration : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-[0.98]"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause weight="fill" className="h-5 w-5" />
          ) : (
            <Play weight="fill" className="h-5 w-5 translate-x-px" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-100">
            {current.title}
          </div>
          <div className="truncate text-xs text-zinc-500">
            {current.uploader_display_name || current.uploader_handle || "Unknown"}
            {current.artist_slugs?.[0] ? (
              <>
                {" · "}
                <Link
                  href={`/artists/${current.artist_slugs[0]}`}
                  className="hover:text-zinc-300"
                >
                  {current.artist_slugs[0]}
                </Link>
              </>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="w-8 text-[10px] tabular-nums text-zinc-500">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(ratio * 1000)}
              onChange={(e) => seek(Number(e.target.value) / 1000)}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-amber-500"
              aria-label="Seek"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-zinc-500">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
