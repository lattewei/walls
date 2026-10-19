"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { shade } from "@/content/library";
import { site } from "@/content/site";
import { IconGrid, IconHome, IconPause, IconPlay, IconSearch } from "./icons";
import { useRoom } from "./room";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const { tone, now, playing, toggle } = useRoom();
  const path = usePathname();
  const canvas = tone ?? "#1c1c1e";
  const side = tone ? shade(tone, -16) : "#161618";

  return (
    <div className="studio" style={{ background: canvas, ["--side" as string]: side }}>
      <aside className="studio__side">
        <Link href="/" className="studio__word">
          {site.name}
        </Link>
        <nav>
          <Link href="/app" className={path === "/app" ? "is-on" : ""}>
            <IconHome />
            Home
          </Link>
          <Link href="/app/artists/johnny" className={path.startsWith("/app/artists") ? "is-on" : ""}>
            <IconGrid />
            Walls
          </Link>
          <span className="studio__search">
            <IconSearch />
            Search
          </span>
        </nav>
      </aside>
      <div className="studio__main">{children}</div>
      {now ? (
        <div className="dock">
          <div className="dock__id">
            <Cover wallTone={now.wall.tone} cover={now.wall.cover} small />
            <div>
              <strong>{now.track.title}</strong>
              <span>{now.track.producer}</span>
            </div>
          </div>
          <button type="button" className="dock__play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
          </button>
          <span className="dock__time">{now.track.duration}</span>
        </div>
      ) : null}
    </div>
  );
}

export function Cover({
  wallTone,
  cover,
  small,
}: {
  wallTone: string;
  cover: { kind: "image"; src: string; position?: string } | { kind: "field" };
  small?: boolean;
}) {
  if (cover.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={small ? "cover cover--sm" : "cover"}
        src={cover.src}
        alt=""
        style={{ objectPosition: cover.position ?? "center" }}
      />
    );
  }
  return (
    <span
      className={small ? "cover cover--sm cover--field" : "cover cover--field"}
      style={{ background: shade(wallTone, 28) }}
    />
  );
}
