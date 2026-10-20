"use client";

import { useState } from "react";

import type { Prod } from "@/content/profiles";
import { IconPause, IconPlay } from "./icons";

export function ProdList({ tracks }: { tracks: Prod[] }) {
  const [on, setOn] = useState<string | null>(null);

  if (tracks.length === 0) {
    return <p className="prods__empty">No productions yet</p>;
  }

  return (
    <ul className="prods__list">
      {tracks.map((track) => {
        const playing = on === track.id;
        return (
          <li key={track.id}>
            <button
              type="button"
              className={playing ? "prod is-on" : "prod"}
              onClick={() => setOn(playing ? null : track.id)}
            >
              <span className="prod__play" aria-hidden>
                {playing ? <IconPause size={12} /> : <IconPlay size={12} />}
              </span>
              <span className="prod__copy">
                <strong>{track.title}</strong>
                <em>{track.artists.join(", ")}</em>
              </span>
              <span className="prod__dur">{track.duration}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
