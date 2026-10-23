"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { site } from "@/content/site";
import { getStoredUser, logout, type AuthUser } from "@/lib/auth";
import { IconGrid, IconHome, IconPanel, IconSearch, IconUser } from "./icons";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const bare = path === "/" || path === "/login" || path === "/register";
  const homeOn = path === "/app";
  const [folded, setFolded] = useState(!homeOn);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (path === "/" || path === "/login" || path === "/register") return;
    setFolded(path !== "/app");
  }, [path]);

  useEffect(() => {
    setUser(getStoredUser());
  }, [path]);

  async function onLogout() {
    await logout();
    setUser(null);
    router.push("/app");
    router.refresh();
  }

  const frame = bare ? "studio is-landing" : folded ? "studio is-folded" : "studio";

  return (
    <div className={frame}>
      <aside className="studio__side">
        <Link href="/app" className="studio__brand">
          {site.name}
        </Link>
        <button
          type="button"
          className="studio__item studio__fold"
          onClick={() => setFolded((v) => !v)}
          aria-expanded={!folded}
          aria-label={folded ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconPanel folded={folded} />
        </button>
        <nav>
          <span className="studio__item studio__item--quiet">
            <IconSearch />
            <span className="studio__label">Search</span>
          </span>
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
    </div>
  );
}
