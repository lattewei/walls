"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { site } from "@/content/site";
import { IconGrid, IconHome, IconSearch } from "./icons";

export function StudioShell({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  const path = usePathname();
  const homeOn = path === "/app";

  return (
    <div className={compact ? "studio studio--slim" : "studio"}>
      <aside className="studio__side">
        <Link href="/" className="wordmark studio__word">
          {site.name}
        </Link>
        <nav>
          <span className="studio__item studio__item--quiet">
            <IconSearch />
            Search
          </span>
          <Link href="/app" className={homeOn ? "studio__item is-on" : "studio__item"}>
            <IconHome />
            Home
          </Link>
          <Link href="/app#artists" className="studio__item">
            <IconGrid />
            Browse
          </Link>
        </nav>
      </aside>
      <main className="studio__main">{children}</main>
    </div>
  );
}
