"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Cover } from "@/components/studio/shell";
import { useRoom } from "@/components/studio/room";
import { walls } from "@/content/library";

export default function AppHome() {
  const room = useRoom();

  const setTone = room.setTone;
  useEffect(() => {
    setTone(null);
  }, [setTone]);

  return (
    <div className="library">
      <h1>Walls</h1>
      <ul>
        {walls.map((wall) => (
          <li key={wall.slug}>
            <Link href={`/app/artists/${wall.slug}`}>
              <Cover wallTone={wall.tone} cover={wall.cover} small />
              <span>
                <strong>{wall.name}</strong>
                <em>
                  {wall.tracks.length} prods · {wall.genre}
                </em>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
