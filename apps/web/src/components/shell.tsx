"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { site } from "@/content/site";
import { logout, updateStoredUser } from "@/lib/auth";
import { getMe } from "@/lib/catalog";
import { useSessionToken, useSessionUser } from "@/lib/session";
import { IconGrid, IconHome, IconPanel, IconSearch, IconShield, IconUser } from "./icons";
import { PlayerDock } from "./player-dock";
import { PlayerProvider } from "./player-context";

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const token = useSessionToken();
  const user = useSessionUser();
  const bare = path === "/" || path === "/login" || path === "/register";
  const homeOn = path === "/app";
  const [foldOverride, setFoldOverride] = useState<boolean | null>(null);
  const folded = foldOverride ?? !homeOn;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { user: me } = await getMe(token);
        if (cancelled) return;
        updateStoredUser({
          handle: me.handle,
          display_name: me.display_name,
          role: me.role || "user",
        });
      } catch {
        // Keep the cached session if the profile refresh fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onLogout() {
    await logout();
    router.push("/app");
    router.refresh();
  }

  const frame = bare ? "frame is-landing" : folded ? "frame is-folded" : "frame";

  return (
    <PlayerProvider>
      <div className={frame}>
        <aside className="rail">
          <Link href="/app" className="rail__brand">
            {site.name}
          </Link>
          <button
            type="button"
            className="rail__item rail__fold"
            onClick={() => setFoldOverride((v) => !(v ?? !homeOn))}
            aria-expanded={!folded}
            aria-label={folded ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconPanel folded={folded} />
          </button>
          <nav>
            <form className="rail__search" action="/app" method="get">
              <IconSearch />
              <input name="q" placeholder="Search walls" aria-label="Search walls" />
            </form>
            <Link href="/app" className={homeOn ? "rail__item is-on" : "rail__item"}>
              <IconHome />
              <span className="rail__label">Home</span>
            </Link>
            <Link href="/app#artists" className="rail__item">
              <IconGrid />
              <span className="rail__label">Browse</span>
            </Link>
            {user ? (
              <>
                <Link
                  href="/artists/new"
                  className={path === "/artists/new" ? "rail__item is-on" : "rail__item"}
                >
                  <span aria-hidden>+</span>
                  <span className="rail__label">New wall</span>
                </Link>
                <Link
                  href="/upload"
                  className={path === "/upload" ? "rail__item is-on" : "rail__item"}
                >
                  <span aria-hidden>↑</span>
                  <span className="rail__label">Upload</span>
                </Link>
                <Link
                  href={`/users/${user.handle}`}
                  className={path.startsWith("/users/") ? "rail__item is-on" : "rail__item"}
                >
                  <IconUser />
                  <span className="rail__label">@{user.handle}</span>
                </Link>
                <Link
                  href="/settings"
                  className={path === "/settings" ? "rail__item is-on" : "rail__item"}
                >
                  <span aria-hidden>✎</span>
                  <span className="rail__label">Settings</span>
                </Link>
                {user.role === "admin" ? (
                  <Link
                    href="/admin"
                    className={path === "/admin" ? "rail__item is-on" : "rail__item"}
                  >
                    <IconShield />
                    <span className="rail__label">Moderation</span>
                  </Link>
                ) : null}
                <button type="button" className="rail__item" onClick={onLogout} aria-label="Log out">
                  <span aria-hidden>×</span>
                  <span className="rail__label">Log out</span>
                </button>
              </>
            ) : (
              <Link href="/login" className={path === "/login" ? "rail__item is-on" : "rail__item"}>
                <IconUser />
                <span className="rail__label">Log in</span>
              </Link>
            )}
          </nav>
        </aside>
        <div className="stage" id="main">
          {children}
        </div>
        {!bare ? <PlayerDock /> : null}
      </div>
    </PlayerProvider>
  );
}
