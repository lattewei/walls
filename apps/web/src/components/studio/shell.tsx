"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconGrid, IconHome, IconSearch } from "./icons";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const homeOn = path === "/app";
  const folded = path !== "/app";

  return (
    <div className={folded ? "studio is-folded" : "studio"}>
      <aside className="studio__side">
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
        </nav>
      </aside>
      <main className="studio__main">{children}</main>
    </div>
  );
}
