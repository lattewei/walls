"use client";

import { useEffect } from "react";

import type { Wall } from "@/content/library";
import { IconPause, IconPlay } from "./icons";
import { Cover } from "./shell";
import { useRoom } from "./room";

export function Album({ wall }: { wall: Wall }) {
  const room = useRoom();

  const setTone = room.setTone;
  useEffect(() => {
    setTone(wall.tone);
    return () => setTone(null);
  }, [wall.tone, setTone]);

  const currentId = room.now?.track.id;

  return (
    <article className="album">
      <header className="album__head">
        <Cover wallTone={wall.tone} cover={wall.cover} />
        <div className="album__copy">
          <h1>{wall.name}</h1>
          <p className="album__sub">Community wall</p>
          <p className="album__meta">
            {wall.genre} · {wall.year}
          </p>
          <button
            type="button"
            className="album__play"
            onClick={() => room.play(wall, wall.tracks[0])}
          >
            <IconPlay size={12} />
            Play
          </button>
        </div>
      </header>

      <ol className="tracklist">
        {wall.tracks.map((track, i) => {
          const on = currentId === track.id;
          return (
            <li key={track.id} className={on ? "is-on" : ""}>
              <button type="button" onClick={() => room.play(wall, track)}>
                <span className="tracklist__n">
                  {on && room.playing ? <IconPause size={12} /> : on ? <IconPlay size={12} /> : i + 1}
                </span>
                <span className="tracklist__name">
                  <strong>{track.title}</strong>
                  <em>{track.producer}</em>
                </span>
                <span className="tracklist__dur">{track.duration}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
