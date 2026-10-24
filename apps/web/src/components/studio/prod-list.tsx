"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { reportTarget, withdrawTrack } from "@/lib/catalog";
import type { ProdRow } from "@/lib/types";
import { formatDuration } from "@/lib/types";
import { usePlayer } from "./player-context";
import { IconPause, IconPlay } from "./icons";

export function ProdList({
  tracks,
  loadError,
}: {
  tracks: ProdRow[];
  loadError?: string | null;
}) {
  const player = usePlayer();
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = tracks.filter((t) => !hidden.has(t.id));

  function needToken() {
    const token = getToken();
    if (!token) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return null;
    }
    return token;
  }

  async function onWithdraw(trackId: string) {
    const token = needToken();
    if (!token) return;
    if (confirmId !== trackId) {
      setConfirmId(trackId);
      setReportId(null);
      return;
    }

    setError(null);
    setNotice(null);
    setBusyId(trackId);
    try {
      await withdrawTrack(trackId, token);
      setHidden((prev) => new Set(prev).add(trackId));
      setConfirmId(null);
      if (player.track?.id === trackId) {
        player.pause();
      }
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not remove track.");
    } finally {
      setBusyId(null);
    }
  }

  async function onReport(e: FormEvent) {
    e.preventDefault();
    if (!reportId) return;
    const token = needToken();
    if (!token) return;
    const why = reason.trim();
    if (!why) return;
    setError(null);
    setNotice(null);
    try {
      await reportTarget(token, "track", reportId, why, "");
      setNotice("Report sent.");
      setReportId(null);
      setReason("");
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not send report.");
    }
  }

  if (loadError) {
    return <p className="prods__err">{loadError}</p>;
  }

  if (rows.length === 0) {
    return <p className="prods__empty">No productions yet</p>;
  }

  return (
    <>
      {error ? <p className="prods__err">{error}</p> : null}
      {notice ? <p className="prods__ok">{notice}</p> : null}
      <ul className="prods__list">
        {rows.map((track, i) => {
          const active = player.track?.id === track.id;
          const playing = active && player.playing;
          const canPlay = Boolean(track.audioUrl);

          return (
            <li key={track.id}>
              <div className={active ? "prod is-on" : "prod"}>
                <button
                  type="button"
                  className="prod__play"
                  disabled={!canPlay}
                  onClick={() => {
                    if (active) {
                      player.toggle();
                      return;
                    }
                    player.playQueue(rows, track.id);
                  }}
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
                <span className="prod__n" aria-hidden>
                  {active && playing ? "" : i + 1}
                </span>
                <span className="prod__copy">
                  <strong>{track.title}</strong>
                  {track.metaHref ? (
                    <Link href={track.metaHref} className="prod__meta">
                      {track.meta}
                    </Link>
                  ) : (
                    <em>{track.meta}</em>
                  )}
                  {track.detail ? <em className="prod__detail">{track.detail}</em> : null}
                </span>
                <span className="prod__dur">{formatDuration(track.durationSeconds ?? (active && player.duration > 0 ? player.duration : null))}</span>
                <button
                  type="button"
                  className="prod__rm"
                  onClick={() => {
                    setReportId(track.id);
                    setConfirmId(null);
                    setNotice(null);
                    setError(null);
                  }}
                >
                  Report
                </button>
                {track.canWithdraw ? (
                  <button
                    type="button"
                    className="prod__rm"
                    disabled={busyId === track.id}
                    onClick={() => onWithdraw(track.id)}
                  >
                    {busyId === track.id ? "…" : confirmId === track.id ? "Confirm" : "Remove"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {reportId ? (
        <form className="prod__report" onSubmit={onReport}>
          <label className="auth__field">
            <span>Why are you reporting this production?</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </label>
          <div className="prod__report-actions">
            <button type="submit" className="auth__submit">
              Send report
            </button>
            <button
              type="button"
              className="prod__rm"
              onClick={() => {
                setReportId(null);
                setReason("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
