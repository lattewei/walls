"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { IconGrid, IconHome, IconPanel, IconSearch } from "./icons";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const landing = path === "/";
  const homeOn = path === "/app";
  const [folded, setFolded] = useState(!homeOn);

  useEffect(() => {
    if (path === "/") return;
    setFolded(path !== "/app");
  }, [path]);

  const frame = landing ? "studio is-landing" : folded ? "studio is-folded" : "studio";

  return (
    <div className={frame}>
      <aside className="studio__side">
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
        </nav>
      </aside>
      <div className="studio__main">{children}</div>
    </div>
  );
}
