import Link from "next/link";

import { site } from "@/content/site";
import { IconGrid, IconHome, IconSearch } from "./icons";

export function StudioShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio">
      <aside className="studio__side">
        <Link href="/" className="wordmark studio__word">
          {site.name}
        </Link>
        <nav>
          <span className="studio__item studio__item--quiet">
            <IconSearch />
            Search
          </span>
          <Link href="/app" className="studio__item is-on">
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
