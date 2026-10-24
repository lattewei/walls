"use client";

import { formatDuration } from "@/lib/types";
import { usePlayerOptional } from "./player-context";
import { IconPause, IconPlay } from "./icons";

function IconPrev() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6h2.2v12H6V6Zm3.2 6 9.3 6.2V5.8L9.2 12Z" fill="currentColor" />
    </svg>
  );
}

function IconNext() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M15.8 6H18v12h-2.2V6ZM5.5 5.8v12.4L14.8 12 5.5 5.8Z" fill="currentColor" />
    </svg>
  );
}

export function PlayerBar() {
  const player = usePlayerOptional();
  if (!player?.track) return null;

  const { track, playing, currentTime, duration, toggle, next, prev, seek, skip } = player;
  const total = duration > 0 ? duration : 0;
  const progress = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;

  return (
    <div className="now">
      <div className="now__inner">
        <div className="now__meta">
          <div className="now__art" aria-hidden>
            {track.coverUrl ? (
              <img src={track.coverUrl} alt="" />
            ) : (
              <span>{track.title.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="now__text">
            <strong>{track.title}</strong>
            <span>{track.meta}</span>
          </div>
        </div>

        <div className="now__center">
          <div className="now__controls">
            <button type="button" className="now__btn" onClick={prev} aria-label="Previous">
              <IconPrev />
            </button>
            <button
              type="button"
              className="now__btn now__btn--main"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
            </button>
            <button type="button" className="now__btn" onClick={next} aria-label="Next">
              <IconNext />
            </button>
          </div>
          <div className="now__scrub">
            <span className="now__time">{formatDuration(currentTime)}</span>
            <input
              type="range"
              className="now__range"
              min={0}
              max={total || 0}
              step={0.1}
              value={Math.min(currentTime, total || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
              style={{ ["--progress" as string]: `${progress}%` }}
            />
            <span className="now__time">{formatDuration(total)}</span>
          </div>
        </div>

        <div className="now__side">
          <button type="button" className="now__chip" onClick={() => skip(-10)} aria-label="Back 10 seconds">
            -10
          </button>
          <button type="button" className="now__chip" onClick={() => skip(10)} aria-label="Forward 10 seconds">
            +10
          </button>
        </div>
      </div>
    </div>
  );
}
