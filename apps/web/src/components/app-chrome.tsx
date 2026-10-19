import Link from "next/link";

import { appHome } from "@/content/app-home";
import { site } from "@/content/site";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="index">
      <header className="index__bar">
        <Link href="/" className="index__mark">
          {site.name}
        </Link>
        <span className="index__slash">/</span>
        <span className="index__here">index</span>
        <Link href="/app/upload" className="index__upload">
          Upload a prod
        </Link>
      </header>

      <div className="index__split">
        <aside className="index__rail">
          <p className="index__rail-label">Channels</p>
          <ul>
            {appHome.rows.map((row) => (
              <li key={row.id}>
                <a href={`#${row.id}`}>
                  <span>{row.title}</span>
                  <span>{row.blocks.length || "–"}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="index__rail-foot">
            No ranking. These are the walls people opened this week.
          </p>
        </aside>
        <div className="index__main">{children}</div>
      </div>
    </div>
  );
}
