"use client";

import { Pause, Play } from "@phosphor-icons/react";
import Link from "next/link";

import { formatTime, usePlayer } from "@/lib/player";
import { Sleeve } from "./sleeve";

export function NowPlaying() {
  const { current, playing, progress, duration, toggle, seek } = usePlayer();
  if (!current) return null;

  const ratio = duration > 0 ? progress / duration : 0;
  const slug = current.artist_slugs?.[0];

  return (
    <div className="fixed inset-x-3 bottom-[4.25rem] z-40 md:inset-x-auto md:bottom-5 md:left-[236px] md:right-6">
      <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-[#1a1714]/90 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl md:gap-4 md:p-3">
        <Sleeve
          seed={current.id}
          className="h-12 w-12 shrink-0 md:h-14 md:w-14"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-[family-name:var(--font-display)] text-sm font-semibold md:text-base">
            {current.title}
          </div>
          <div className="truncate text-xs text-[var(--ink-3)]">
            {current.uploader_handle ? `@${current.uploader_handle}` : "Producer"}
            {slug ? (
              <>
                {"  /  "}
                <Link href={`/artists/${slug}`} className="hover:text-[var(--ink)]">
                  {slug}
                </Link>
              </>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-8 text-[10px] tabular-nums text-[var(--ink-3)]">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(ratio * 1000)}
              onChange={(e) => seek(Number(e.target.value) / 1000)}
              className="flex-1"
              aria-label="Seek"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-[var(--ink-3)]">
              {formatTime(duration)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--bg)] transition duration-300 active:scale-[0.96]"
        >
          {playing ? (
            <Pause weight="fill" className="h-5 w-5" />
          ) : (
            <Play weight="fill" className="ml-0.5 h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
