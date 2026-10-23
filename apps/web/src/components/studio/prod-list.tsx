"use client";

import Link from "next/link";
import { useState } from "react";

import type { ProdRow } from "@/lib/types";
import { IconPause, IconPlay } from "./icons";

export function ProdList({ tracks }: { tracks: ProdRow[] }) {
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
            <div className={playing ? "prod is-on" : "prod"}>
              <button
                type="button"
                className="prod__play"
                onClick={() => setOn(playing ? null : track.id)}
                aria-label={playing ? "Pause" : `Play ${track.title}`}
              >
                {playing ? <IconPause size={12} /> : <IconPlay size={12} />}
              </button>
              <span className="prod__copy">
                <strong>{track.title}</strong>
                {track.metaHref ? (
                  <Link href={track.metaHref} className="prod__meta">
                    {track.meta}
                  </Link>
                ) : (
                  <em>{track.meta}</em>
                )}
              </span>
              <span className="prod__dur">{track.duration}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
