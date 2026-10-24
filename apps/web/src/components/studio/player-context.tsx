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
  const indexRef = useRef(-1);
  const queueRef = useRef<ProdRow[]>([]);
  const [queue, setQueue] = useState<ProdRow[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  indexRef.current = index;
  queueRef.current = queue;
  const track = index >= 0 && index < queue.length ? queue[index] : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      const q = queueRef.current;
      const i = indexRef.current;
      if (i < 0 || i + 1 >= q.length) {
        setPlaying(false);
        return;
      }
      const nextTrack = q[i + 1];
      const audio = audioRef.current;
      if (audio && nextTrack.audioUrl) {
        audio.src = nextTrack.audioUrl;
        void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
      setIndex(i + 1);
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
  }, []);

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
  }, [track?.id, track?.audioUrl, track?.durationSeconds]);

  const start = useCallback((next: ProdRow) => {
    const audio = audioRef.current;
    if (!audio || !next.audioUrl) return;
    const absolute = new URL(next.audioUrl, window.location.origin).href;
    if (audio.src !== absolute) audio.src = next.audioUrl;
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  const playQueue = useCallback((tracks: ProdRow[], startId: string) => {
    const playable = tracks.filter((t) => t.audioUrl);
    const i = playable.findIndex((t) => t.id === startId);
    if (i < 0) return;
    start(playable[i]);
    setQueue(playable);
    setIndex(i);
  }, [start]);

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
    if (index < 0 || index + 1 >= queue.length) return;
    start(queue[index + 1]);
    setIndex(index + 1);
  }, [index, queue, start]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (index > 0) {
      start(queue[index - 1]);
      setIndex(index - 1);
    }
  }, [index, queue, start]);

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
