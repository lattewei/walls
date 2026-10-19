"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { Prod, Wall } from "@/content/library";

type Now = {
  wall: Wall;
  track: Prod;
};

type RoomState = {
  tone: string | null;
  setTone: (tone: string | null) => void;
  now: Now | null;
  playing: boolean;
  play: (wall: Wall, track: Prod) => void;
  toggle: () => void;
};

const RoomContext = createContext<RoomState | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [tone, setTone] = useState<string | null>(null);
  const [now, setNow] = useState<Now | null>(null);
  const [playing, setPlaying] = useState(false);

  const play = useCallback((wall: Wall, track: Prod) => {
    setNow({ wall, track });
    setPlaying(true);
    setTone(wall.tone);
  }, []);

  const toggle = useCallback(() => setPlaying((v) => !v), []);

  const value = useMemo<RoomState>(
    () => ({
      tone,
      setTone,
      now,
      playing,
      play,
      toggle,
    }),
    [tone, now, playing, play, toggle],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom");
  return ctx;
}
