"use client";

import { useState } from "react";

import { usePlayerOptional } from "./player-context";

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden fill="none">
      {children}
    </svg>
  );
}

function IconShuffle() {
  return (
    <Glyph>
      <path d="M4 7.5h3.2c1.4 0 2.6.7 3.3 1.8L16.2 16.4c.7 1.1 1.9 1.8 3.3 1.8H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 16.5h3.2c1.4 0 2.6-.7 3.3-1.8l1.2-1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16.2 7.8c.7-1.1 1.9-1.8 3.3-1.8H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17.2 4.6 20.4 6.2 17.6 8.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.2 15.4 20.4 17.2 17.6 19.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Glyph>
  );
}

function IconPrev() {
  return (
    <Glyph>
      <path d="M6.2 5.2v13.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.2 5.4 9.2 12l9 6.6V5.4Z" fill="currentColor" />
    </Glyph>
  );
}

function IconPlay() {
  return (
    <Glyph>
      <path d="M8.2 4.8v14.4L19.4 12 8.2 4.8Z" fill="currentColor" />
    </Glyph>
  );
}

function IconPause() {
  return (
    <Glyph>
      <path d="M7 5h3.2v14H7V5Zm6.8 0H17v14h-3.2V5Z" fill="currentColor" />
    </Glyph>
  );
}

function IconNext() {
  return (
    <Glyph>
      <path d="M17.8 5.2v13.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5.8 5.4v13.2L14.8 12 5.8 5.4Z" fill="currentColor" />
    </Glyph>
  );
}

function IconRepeat() {
  return (
    <Glyph>
      <path d="M7 7.2h8.2a3.2 3.2 0 0 1 3.2 3.2v1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17 16.8H8.8A3.2 3.2 0 0 1 5.6 13.6v-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14.4 4.8 17.6 7.2 14.4 9.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.6 14.4 6.4 16.8 9.6 19.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Glyph>
  );
}

function IconQueue() {
  return (
    <Glyph>
      <path d="M9 7h10M9 12h10M9 17h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5 7h.01M5 12h.01M5 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </Glyph>
  );
}

function IconVolume({ level }: { level: number }) {
  return (
    <Glyph>
      <path d="M4.5 9.5h2.6L11 6.2v11.6L7.1 14.5H4.5v-5Z" fill="currentColor" />
      {level > 0.02 ? (
        <path d="M14.2 9.2a3.6 3.6 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      ) : null}
      {level > 0.45 ? (
        <path d="M16.6 7a6.4 6.4 0 0 1 0 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      ) : null}
    </Glyph>
  );
}

export function PlayerDock() {
  const player = usePlayerOptional();
  const [queueOpen, setQueueOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const track = player?.track ?? null;
  const playing = Boolean(player?.playing && track);
  const shuffle = Boolean(player?.shuffle);
  const repeat = player?.repeat ?? "off";
  const volume = player?.volume ?? 1;
  const upcoming = player ? player.queue.slice(player.index + 1) : [];

  return (
    <div className="am-player">
      <div className="am-player__side am-player__side--left">
        <button
          type="button"
          className={shuffle ? "am-player__btn is-on" : "am-player__btn"}
          aria-pressed={shuffle}
          aria-label={shuffle ? "Turn shuffle off" : "Shuffle"}
          disabled={!track}
          onClick={() => player?.toggleShuffle()}
        >
          <IconShuffle />
        </button>
        <button type="button" className="am-player__btn" aria-label="Previous" disabled={!track} onClick={() => player?.prev()}>
          <IconPrev />
        </button>
        <button
          type="button"
          className="am-player__btn"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!track}
          onClick={() => player?.toggle()}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="am-player__btn" aria-label="Next" disabled={!track} onClick={() => player?.next()}>
          <IconNext />
        </button>
        <button
          type="button"
          className={repeat === "off" ? "am-player__btn" : "am-player__btn is-on"}
          aria-pressed={repeat !== "off"}
          aria-label={repeat === "one" ? "Repeat one, turn off" : repeat === "all" ? "Repeat all, repeat one" : "Repeat"}
          disabled={!track}
          onClick={() => player?.cycleRepeat()}
        >
          <IconRepeat />
          {repeat === "one" ? <span className="am-player__one">1</span> : null}
        </button>
      </div>

      <span className="am-player__mark" aria-hidden />

      <div className="am-player__side am-player__side--right">
        <div className="am-player__pop">
          <button
            type="button"
            className={queueOpen ? "am-player__btn is-on" : "am-player__btn"}
            aria-pressed={queueOpen}
            aria-label={queueOpen ? "Close queue" : "Up Next"}
            disabled={!track}
            onClick={() => {
              setVolumeOpen(false);
              setQueueOpen((open) => !open);
            }}
          >
            <IconQueue />
          </button>
          {queueOpen ? (
            <div className="am-queue" role="dialog" aria-label="Up Next">
              <p>Up Next</p>
              {upcoming.length === 0 ? (
                <span className="am-queue__empty">Nothing after this.</span>
              ) : (
                <ul>
                  {upcoming.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          player?.playQueue(player.queue, item.id);
                          setQueueOpen(false);
                        }}
                      >
                        <strong>{item.title}</strong>
                        <em>{item.meta}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
        <div
          className="am-player__pop"
          onMouseEnter={() => setVolumeOpen(true)}
          onMouseLeave={() => setVolumeOpen(false)}
        >
          <button
            type="button"
            className="am-player__btn"
            aria-label={volume === 0 ? "Unmute" : "Volume"}
            aria-expanded={volumeOpen}
            onClick={() => player?.setVolume(volume === 0 ? 1 : 0)}
          >
            <IconVolume level={volume} />
          </button>
          {volumeOpen ? (
            <label className="am-volume">
              <span className="sr">Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                aria-label="Volume"
                onChange={(e) => player?.setVolume(Number(e.target.value))}
              />
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}
