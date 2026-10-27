"use client";

import { formatDuration } from "@/lib/types";
import { IconNext, IconPause, IconPlay, IconPrev } from "./icons";
import { usePlayerOptional } from "./player-context";

export function PlayerDock() {
  const player = usePlayerOptional();
  if (!player?.track) return null;

  const { track, playing, currentTime, duration, toggle, next, prev, seek } = player;
  const total = duration > 0 ? duration : 0;
  const progress = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;

  return (
    <div className="dock">
      <div className="dock__inner">
        <div className="dock__meta">
          <div className="dock__art" aria-hidden>
            {track.coverUrl ? (
              <img src={track.coverUrl} alt="" />
            ) : (
              <span>{track.title.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="dock__text">
            <strong>{track.title}</strong>
            <span>{track.meta}</span>
          </div>
        </div>

        <div className="dock__controls">
          <button type="button" className="dock__btn" onClick={prev} aria-label="Previous">
            <IconPrev />
          </button>
          <button
            type="button"
            className="dock__btn dock__btn--main"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
          <button type="button" className="dock__btn" onClick={next} aria-label="Next">
            <IconNext />
          </button>
        </div>

        <input
          type="range"
          className="dock__range"
          min={0}
          max={total || 0}
          step={0.1}
          value={Math.min(currentTime, total || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(total)}`}
          style={{ ["--progress" as string]: `${progress}%` }}
        />
      </div>
    </div>
  );
}
