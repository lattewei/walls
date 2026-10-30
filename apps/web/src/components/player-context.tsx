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

import { getToken } from "@/lib/auth";
import { recordPlay } from "@/lib/catalog";
import type { ProdRow } from "@/lib/types";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  queue: ProdRow[];
  index: number;
  track: ProdRow | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  playQueue: (tracks: ProdRow[], startId: string) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVolume: (value: number) => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const indexRef = useRef(-1);
  const queueRef = useRef<ProdRow[]>([]);
  const sourceRef = useRef<ProdRow[]>([]);
  const repeatRef = useRef<RepeatMode>("off");
  const [queue, setQueue] = useState<ProdRow[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [volume, setVolumeState] = useState(1);

  const track = index >= 0 && index < queue.length ? queue[index] : null;

  useEffect(() => {
    indexRef.current = index;
    queueRef.current = queue;
    repeatRef.current = repeat;
  }, [index, queue, repeat]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      const q = queueRef.current;
      const i = indexRef.current;
      const el = audioRef.current;
      const mode = repeatRef.current;
      if (!el || i < 0 || q.length === 0) {
        setPlaying(false);
        return;
      }
      if (mode === "one") {
        el.currentTime = 0;
        void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        return;
      }
      const wrap = mode === "all";
      const nextIndex = i + 1 < q.length ? i + 1 : wrap ? 0 : -1;
      if (nextIndex < 0) {
        setPlaying(false);
        return;
      }
      const nextTrack = q[nextIndex];
      if (nextTrack.audioUrl) {
        el.src = nextTrack.audioUrl;
        void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
      setIndex(nextIndex);
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

  const countedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!track?.id) return;
    const need = duration > 0 && duration < 15 ? duration * 0.5 : 15;
    if (currentTime < need) return;
    if (countedRef.current.has(track.id)) return;
    countedRef.current.add(track.id);
    void recordPlay(track.id, getToken());
  }, [track?.id, currentTime, duration]);

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
    sourceRef.current = playable;
    start(playable[i]);
    setQueue(playable);
    setIndex(i);
    setShuffle(false);
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
    if (index < 0 || queue.length === 0) return;
    if (index + 1 < queue.length) {
      start(queue[index + 1]);
      setIndex(index + 1);
      return;
    }
    if (repeat === "all") {
      start(queue[0]);
      setIndex(0);
    }
  }, [index, queue, repeat, start]);

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

  const toggleShuffle = useCallback(() => {
    const current = queueRef.current[indexRef.current];
    if (!current) {
      setShuffle((on) => !on);
      return;
    }
    setShuffle((on) => {
      if (on) {
        const source = sourceRef.current.length ? sourceRef.current : queueRef.current;
        const i = source.findIndex((t) => t.id === current.id);
        setQueue(source);
        setIndex(i < 0 ? 0 : i);
        return false;
      }
      const rest = queueRef.current.filter((t) => t.id !== current.id);
      for (let n = rest.length - 1; n > 0; n -= 1) {
        const j = Math.floor(Math.random() * (n + 1));
        const swap = rest[n];
        rest[n] = rest[j];
        rest[j] = swap;
      }
      setQueue([current, ...rest]);
      setIndex(0);
      return true;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off"));
  }, []);

  const setVolume = useCallback((value: number) => {
    const next = Math.max(0, Math.min(1, value));
    setVolumeState(next);
    if (audioRef.current) audioRef.current.volume = next;
  }, []);

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      index,
      track,
      playing,
      currentTime,
      duration: duration || track?.durationSeconds || 0,
      shuffle,
      repeat,
      volume,
      playQueue,
      toggle,
      play,
      pause,
      next,
      prev,
      seek,
      toggleShuffle,
      cycleRepeat,
      setVolume,
    }),
    [
      queue,
      index,
      track,
      playing,
      currentTime,
      duration,
      shuffle,
      repeat,
      volume,
      playQueue,
      toggle,
      play,
      pause,
      next,
      prev,
      seek,
      toggleShuffle,
      cycleRepeat,
      setVolume,
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
