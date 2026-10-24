"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { site } from "@/content/site";
import { logout } from "@/lib/auth";
import { useSessionUser } from "@/lib/session";
import { IconGrid, IconHome, IconPanel, IconSearch, IconUser } from "./icons";
import { PlayerBar } from "./player-bar";
import { PlayerProvider } from "./player-context";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const user = useSessionUser();
  const bare = path === "/" || path === "/login" || path === "/register";
  const homeOn = path === "/app";
  const [foldOverride, setFoldOverride] = useState<boolean | null>(null);
  const folded = foldOverride ?? !homeOn;

  async function onLogout() {
    await logout();
    router.push("/app");
    router.refresh();
  }

  const frame = bare ? "studio is-landing" : folded ? "studio is-folded" : "studio";

  return (
    <PlayerProvider>
      <div className={frame}>
        <aside className="studio__side">
          <Link href="/app" className="studio__brand">
            {site.name}
          </Link>
          <button
            type="button"
            className="studio__item studio__fold"
            onClick={() => setFoldOverride((v) => !(v ?? !homeOn))}
            aria-expanded={!folded}
            aria-label={folded ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconPanel folded={folded} />
          </button>
          <nav>
            <form className="studio__search" action="/app" method="get">
              <IconSearch />
              <input name="q" placeholder="Search walls" aria-label="Search walls" />
            </form>
            <Link href="/app" className={homeOn ? "studio__item is-on" : "studio__item"}>
              <IconHome />
              <span className="studio__label">Home</span>
            </Link>
            <Link href="/app#artists" className="studio__item">
              <IconGrid />
              <span className="studio__label">Browse</span>
            </Link>
            {user ? (
              <>
                <Link
                  href="/artists/new"
                  className={path === "/artists/new" ? "studio__item is-on" : "studio__item"}
                >
                  <span aria-hidden>+</span>
                  <span className="studio__label">New wall</span>
                </Link>
                <Link
                  href="/upload"
                  className={path === "/upload" ? "studio__item is-on" : "studio__item"}
                >
                  <span aria-hidden>↑</span>
                  <span className="studio__label">Upload</span>
                </Link>
                <Link
                  href={`/users/${user.handle}`}
                  className={path.startsWith("/users/") ? "studio__item is-on" : "studio__item"}
                >
                  <IconUser />
                  <span className="studio__label">@{user.handle}</span>
                </Link>
                <Link
                  href="/settings"
                  className={path === "/settings" ? "studio__item is-on" : "studio__item"}
                >
                  <span aria-hidden>✎</span>
                  <span className="studio__label">Settings</span>
                </Link>
                <button type="button" className="studio__item" onClick={onLogout} aria-label="Log out">
                  <span aria-hidden>×</span>
                  <span className="studio__label">Log out</span>
                </button>
              </>
            ) : (
              <Link href="/login" className={path === "/login" ? "studio__item is-on" : "studio__item"}>
                <IconUser />
                <span className="studio__label">Log in</span>
              </Link>
            )}
          </nav>
        </aside>
        <div className="studio__main">{children}</div>
        {!bare ? <PlayerBar /> : null}
      </div>
    </PlayerProvider>
  );
}
