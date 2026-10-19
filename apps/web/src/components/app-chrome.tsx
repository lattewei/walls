import Link from "next/link";

import { site } from "@/content/site";
import { appHome } from "@/content/app-home";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-top">
        <div className="app-top__inner">
          <Link href="/" className="app-top__brand">
            {site.name}
          </Link>
          <nav className="app-top__nav" aria-label="App">
            <Link href="/app" className="app-top__link app-top__link--active">
              Home
            </Link>
            <Link href="/app#artists" className="app-top__link">
              Artists
            </Link>
            <Link href="/app#beatmakers" className="app-top__link">
              Beatmakers
            </Link>
          </nav>
          <div className="app-top__actions">
            <Link href="/app/upload" className="app-top__cta">
              Upload
            </Link>
          </div>
        </div>
      </header>
      <main className="app-main">
        <div className="app-main__inner">
          <div className="app-heading">
            <h1 className="app-heading__title">{appHome.title}</h1>
            <p className="app-heading__hint">
              Walls and producers — open a square to go deeper.
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
