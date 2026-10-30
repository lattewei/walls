"use client";

import type { ProdRow } from "@/lib/types";
import { IconPlay } from "./icons";
import { usePlayerOptional } from "./player-context";

export function Station({ tracks }: { tracks: ProdRow[] }) {
  const player = usePlayerOptional();
  const first = tracks.find((t) => t.audioUrl);
  const playingHere = Boolean(first && player?.queue.some((t) => tracks.some((row) => row.id === t.id)) && player.playing);

  function play() {
    if (!player || tracks.length === 0) return;
    const order = tracks.filter((t) => t.audioUrl);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = order[i];
      order[i] = order[j];
      order[j] = swap;
    }
    if (!order[0]) return;
    if (player.track && order.some((t) => t.id === player.track?.id) && player.playing) {
      player.pause();
      return;
    }
    player.playQueue(order, order[0].id);
  }

  return (
    <div className="am-station">
      <button type="button" className="am-preview" disabled={!first} onClick={play}>
        <IconPlay size={12} />
        {playingHere ? "Pause" : "Play"}
      </button>
      <SongGrid tracks={tracks} />
    </div>
  );
}

export function PreviewButton({ tracks }: { tracks: ProdRow[] }) {
  const player = usePlayerOptional();
  const first = tracks.find((t) => t.audioUrl);
  const active = Boolean(first && player?.track?.id === first.id && player.playing);

  return (
    <button
      type="button"
      className="am-preview"
      disabled={!first}
      onClick={() => {
        if (!player || !first) return;
        if (player.track?.id === first.id) {
          player.toggle();
          return;
        }
        player.playQueue(tracks, first.id);
      }}
    >
      <IconPlay size={12} />
      {active ? "Pause" : "Preview"}
    </button>
  );
}

export function FeaturePlay({ tracks }: { tracks: ProdRow[] }) {
  const player = usePlayerOptional();
  const first = tracks.find((t) => t.audioUrl);
  if (!first) return null;

  return (
    <button
      type="button"
      className="am-card__play"
      aria-label={`Play ${first.title}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!player) return;
        if (player.track?.id === first.id) {
          player.toggle();
          return;
        }
        player.playQueue(tracks, first.id);
      }}
    >
      <IconPlay size={14} />
    </button>
  );
}

export function SongGrid({ tracks }: { tracks: ProdRow[] }) {
  const player = usePlayerOptional();
  if (tracks.length === 0) {
    return <p className="am-empty">Nothing new yet.</p>;
  }

  return (
    <ul className="am-songs">
      {tracks.map((track) => {
        const active = player?.track?.id === track.id;
        return (
          <li key={track.id}>
            <button
              type="button"
              className={active ? "am-song is-on" : "am-song"}
              disabled={!track.audioUrl}
              onClick={() => {
                if (!player || !track.audioUrl) return;
                if (active) {
                  player.toggle();
                  return;
                }
                player.playQueue(tracks, track.id);
              }}
            >
              <span className="am-song__art" aria-hidden>
                {track.coverUrl ? <img src={track.coverUrl} alt="" /> : track.title.slice(0, 1)}
              </span>
              <span className="am-song__copy">
                <strong>{track.title}</strong>
                <em>{track.meta}</em>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
