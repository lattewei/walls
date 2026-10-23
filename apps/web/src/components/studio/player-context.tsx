"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { ProdRow } from "@/lib/types";
import { formatDuration } from "@/lib/types";

type PlayerState = {
  queue: ProdRow[];
  index: number;
  track: ProdRow | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  playQueue: (tracks: ProdRow[], startId: string) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<ProdRow[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const track = index >= 0 && index < queue.length ? queue[index] : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      setIndex((i) => {
        if (i < 0) return i;
        if (i + 1 < queue.length) return i + 1;
        setPlaying(false);
        return i;
      });
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [queue.length]);

  useEffect(() => {
    if (!track?.audioUrl) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    const absolute = new URL(track.audioUrl, window.location.origin).href;
    if (audio.src !== absolute) {
      audio.src = track.audioUrl;
      setCurrentTime(0);
      setDuration(track.durationSeconds ?? 0);
    }
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [track?.id, track?.audioUrl, track?.durationSeconds]);

  const playQueue = useCallback((tracks: ProdRow[], startId: string) => {
    const playable = tracks.filter((t) => t.audioUrl);
    const i = playable.findIndex((t) => t.id === startId);
    if (i < 0) return;
    setQueue(playable);
    setIndex(i);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [track]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [track]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i < 0 || i + 1 >= queue.length) return i;
      return i + 1;
    });
  }, [queue.length]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setCurrentTime(audio.currentTime);
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seek(audio.currentTime + delta);
  }, [seek]);

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      index,
      track,
      playing,
      currentTime,
      duration: duration || track?.durationSeconds || 0,
      playQueue,
      toggle,
      play,
      pause,
      next,
      prev,
      seek,
      skip,
    }),
    [
      queue,
      index,
      track,
      playing,
      currentTime,
      duration,
      playQueue,
      toggle,
      play,
      pause,
      next,
      prev,
      seek,
      skip,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioRef} preload="metadata" />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function usePlayerOptional() {
  return useContext(PlayerContext);
}

export { formatDuration };
