"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { reportTarget, updateTrack, withdrawTrack } from "@/lib/catalog";
import { useSessionUser } from "@/lib/session";
import type { ProdRow } from "@/lib/types";
import { formatDuration } from "@/lib/types";
import { usePlayer } from "./player-context";
import { IconMore, IconPause, IconPlay } from "./icons";

function parseList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,/|]/)
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

type Draft = {
  title: string;
  description: string;
  tags: string;
  artists: string;
};

const emptyDraft: Draft = { title: "", description: "", tags: "", artists: "" };

export function TrackList({
  tracks,
  loadError,
}: {
  tracks: ProdRow[];
  loadError?: string | null;
}) {
  const player = usePlayer();
  const router = useRouter();
  const user = useSessionUser();
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [patches, setPatches] = useState<Record<string, Partial<ProdRow>>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      tracks
        .map((t) => ({ ...t, ...patches[t.id] }))
        .filter((t) => !hidden.has(t.id)),
    [tracks, patches, hidden],
  );

  function needToken() {
    const token = getToken();
    if (!token) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return null;
    }
    return token;
  }

  function canManage(track: ProdRow) {
    if (track.canWithdraw) return true;
    return Boolean(user?.handle && track.uploaderHandle === user.handle);
  }

  function startEdit(track: ProdRow) {
    setEditId(track.id);
    setDraft({
      title: track.title,
      description: track.description ?? "",
      tags: (track.tags ?? []).join(", "),
      artists: (track.artistSlugs ?? []).join(", "),
    });
    setConfirmId(null);
    setReportId(null);
    setError(null);
    setNotice(null);
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editId) return;
    const token = needToken();
    if (!token) return;
    const title = draft.title.trim();
    if (!title) {
      setError("Title is required.");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyId(editId);
    try {
      const { track } = await updateTrack(
        editId,
        {
          title,
          description: draft.description.trim() || null,
          tags: parseList(draft.tags),
          artist_slugs: parseList(draft.artists),
        },
        token,
      );
      const tags = track.tags ?? [];
      const description = track.description ?? null;
      setPatches((prev) => ({
        ...prev,
        [editId]: {
          title: track.title,
          description,
          tags,
          artistSlugs: track.artist_slugs ?? [],
          detail: [description, tags.length ? tags.join(", ") : ""]
            .filter(Boolean)
            .join(" · "),
        },
      }));
      setEditId(null);
      setNotice("Production updated.");
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not update production.");
    } finally {
      setBusyId(null);
    }
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
      if (player.track?.id === trackId) player.pause();
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

  if (loadError) return <p className="note note--err">{loadError}</p>;
  if (rows.length === 0) return <p className="note note--empty">No productions yet.</p>;

  return (
    <>
      {error ? <p className="note note--err">{error}</p> : null}
      {notice ? <p className="note note--ok">{notice}</p> : null}
      <div className="am-cols" aria-hidden>
        <span>Song</span>
        <span>Artist</span>
        <span>Album</span>
        <span>Time</span>
        <span />
      </div>
      <ul className="am-table">
        {rows.map((track) => {
          const active = player.track?.id === track.id;
          const playing = active && player.playing;
          const canPlay = Boolean(track.audioUrl);
          const owner = canManage(track);
          const album = track.artistSlugs?.[0] || "Single";

          return (
            <li key={track.id}>
              <div className={active ? "am-row is-on" : "am-row"}>
                <button
                  type="button"
                  className="am-row__song"
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
                  <span className="am-row__art" aria-hidden>
                    {playing ? (
                      <IconPause size={12} />
                    ) : track.coverUrl ? (
                      <img src={track.coverUrl} alt="" />
                    ) : (
                      <IconPlay size={11} />
                    )}
                  </span>
                  <strong>{track.title}</strong>
                </button>
                {track.metaHref ? (
                  <Link href={track.metaHref} className="am-row__artist">
                    {track.meta}
                  </Link>
                ) : (
                  <span className="am-row__artist">{track.meta}</span>
                )}
                {track.artistSlugs?.[0] ? (
                  <Link href={`/artists/${track.artistSlugs[0]}`} className="am-row__album">
                    {album}
                  </Link>
                ) : (
                  <span className="am-row__album">{album}</span>
                )}
                <span className="am-row__time">
                  {formatDuration(
                    track.durationSeconds ?? (active && player.duration > 0 ? player.duration : null),
                  )}
                </span>
                <span className="am-more">
                  <button
                    type="button"
                    aria-label={`More actions for ${track.title}`}
                    aria-expanded={menuId === track.id}
                    onClick={() => setMenuId(menuId === track.id ? null : track.id)}
                  >
                    <IconMore />
                  </button>
                  {menuId === track.id ? (
                    <div className="am-menu" role="menu">
                      {owner ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            startEdit(track);
                            setMenuId(null);
                          }}
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setReportId(track.id);
                            setMenuId(null);
                            setConfirmId(null);
                            setEditId(null);
                            setNotice(null);
                            setError(null);
                          }}
                        >
                          Report
                        </button>
                      )}
                      {owner ? (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={busyId === track.id}
                          onClick={() => onWithdraw(track.id)}
                        >
                          {busyId === track.id ? "…" : confirmId === track.id ? "Confirm remove" : "Remove"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </span>
              </div>

              {editId === track.id ? (
                <form className="track__edit" onSubmit={onSaveEdit}>
                  <div className="track__edit-grid">
                    <label className="field">
                      <span>Title</span>
                      <input
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        required
                        maxLength={120}
                        autoFocus
                      />
                    </label>
                    <label className="field">
                      <span>Tags</span>
                      <input
                        value={draft.tags}
                        onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                        placeholder="drill, dark, 140"
                        maxLength={120}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      rows={2}
                      maxLength={2000}
                      placeholder="BPM, key, notes"
                    />
                  </label>
                  <label className="field">
                    <span>Walls (slugs, comma-separated)</span>
                    <input
                      value={draft.artists}
                      onChange={(e) => setDraft({ ...draft, artists: e.target.value })}
                      placeholder="johnny, metro"
                      maxLength={400}
                    />
                  </label>
                  <div className="wall__actions">
                    <button type="submit" className="btn" disabled={busyId === track.id}>
                      {busyId === track.id ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setEditId(null);
                        setError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
      {reportId ? (
        <form className="tracks__report" onSubmit={onReport}>
          <label className="field">
            <span>Why are you reporting this production?</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </label>
          <div className="wall__actions">
            <button type="submit" className="btn">
              Send report
            </button>
            <button
              type="button"
              className="btn btn--ghost"
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

export function OwnerTrackList({
  handle,
  tracks,
  loadError,
}: {
  handle: string;
  tracks: ProdRow[];
  loadError?: string | null;
}) {
  const user = useSessionUser();
  const owner = user?.handle === handle;
  const rows = useMemo(
    () => tracks.map((t) => ({ ...t, canWithdraw: owner })),
    [tracks, owner],
  );
  return <TrackList tracks={rows} loadError={loadError} />;
}
