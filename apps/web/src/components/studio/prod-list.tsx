"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ProdRow } from "@/lib/types";
import { IconPause, IconPlay } from "./icons";

export function ProdList({ tracks }: { tracks: ProdRow[] }) {
  const [on, setOn] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!on) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    const track = tracks.find((t) => t.id === on);
    if (!track?.audioUrl) {
      setOn(null);
      return;
    }

    audio.src = track.audioUrl;
    void audio.play().catch(() => setOn(null));
  }, [on, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setOn(null);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  if (tracks.length === 0) {
    return <p className="prods__empty">No productions yet</p>;
  }

  return (
    <>
      <audio ref={audioRef} preload="none" />
      <ul className="prods__list">
        {tracks.map((track) => {
          const playing = on === track.id;
          const canPlay = Boolean(track.audioUrl);
          return (
            <li key={track.id}>
              <div className={playing ? "prod is-on" : "prod"}>
                <button
                  type="button"
                  className="prod__play"
                  disabled={!canPlay}
                  onClick={() => setOn(playing ? null : track.id)}
                  aria-label={
                    !canPlay
                      ? `${track.title} not ready`
                      : playing
                        ? "Pause"
                        : `Play ${track.title}`
                  }
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
    </>
  );
}
