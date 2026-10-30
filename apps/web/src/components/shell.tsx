"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { site } from "@/content/site";
import { logout, updateStoredUser } from "@/lib/auth";
import { getMe } from "@/lib/catalog";
import { useSessionToken, useSessionUser } from "@/lib/session";
import { IconNavHome, IconNavNew, IconNavRadio, IconNavSearch, IconPerson } from "./icons";
import { PlayerDock } from "./player-dock";
import { PlayerProvider } from "./player-context";

function SideNav({
  path,
  user,
  onLogout,
}: {
  path: string;
  user: { handle: string; role: string } | null;
  onLogout: () => void;
}) {
  const params = useSearchParams();
  const view = params.get("view") ?? "";
  const onApp = path === "/app";
  const onSearch = path === "/search";
  const onHome = onApp && view !== "new" && view !== "radio";
  const onNew = onApp && view === "new";
  const onRadio = onApp && view === "radio";
  const here = `${path}${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <>
      <nav className="am-nav" aria-label="Primary">
        <Link href="/search" className={onSearch ? "am-item is-on" : "am-item"} aria-current={onSearch ? "page" : undefined}>
          <IconNavSearch />
          <span>Search</span>
        </Link>
        <Link href="/app" className={onHome ? "am-item is-on" : "am-item"} aria-current={onHome ? "page" : undefined}>
          <IconNavHome />
          <span>Home</span>
        </Link>
        <Link href="/app?view=new" className={onNew ? "am-item is-on" : "am-item"} aria-current={onNew ? "page" : undefined}>
          <IconNavNew />
          <span>New</span>
        </Link>
        <Link href="/app?view=radio" className={onRadio ? "am-item is-on" : "am-item"} aria-current={onRadio ? "page" : undefined}>
          <IconNavRadio />
          <span>Radio</span>
        </Link>
      </nav>
      <div className="am-side__foot">
        {user ? (
          <>
            <Link href={`/users/${user.handle}`} className={path === `/users/${user.handle}` ? "am-side__quiet is-on" : "am-side__quiet"}>
              @{user.handle}
            </Link>
            <Link href="/upload" className={path === "/upload" ? "am-side__quiet is-on" : "am-side__quiet"}>
              Upload
            </Link>
            <Link href="/artists/new" className={path === "/artists/new" ? "am-side__quiet is-on" : "am-side__quiet"}>
              New wall
            </Link>
            <Link href="/settings" className={path === "/settings" ? "am-side__quiet is-on" : "am-side__quiet"}>
              Settings
            </Link>
            {user.role === "admin" ? (
              <Link href="/admin" className={path === "/admin" ? "am-side__quiet is-on" : "am-side__quiet"}>
                Moderation
              </Link>
            ) : null}
            <button type="button" className="am-side__quiet" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(here)}`} className="am-signin">
            <IconPerson />
            Sign In
          </Link>
        )}
      </div>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const token = useSessionToken();
  const user = useSessionUser();
  const bare = path === "/" || path === "/login" || path === "/register";

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

  if (bare) {
    return (
      <PlayerProvider>
        <div className="frame is-landing">
          <div className="stage" id="main">
            {children}
          </div>
        </div>
      </PlayerProvider>
    );
  }

  return (
    <PlayerProvider>
      <div className="am">
        <aside className="am-side">
          <Link href="/app" className="am-logo">
            {site.name}
          </Link>
          <Suspense fallback={null}>
            <SideNav path={path} user={user} onLogout={onLogout} />
          </Suspense>
        </aside>
        <div className="am-main" id="main">
          {children}
        </div>
        <PlayerDock />
      </div>
    </PlayerProvider>
  );
}
