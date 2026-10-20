import Link from "next/link";

import { site } from "@/content/site";

export default function UserNotFound() {
  return (
    <div className="profile">
      <header className="profile__bar">
        <Link href="/app" className="wordmark">
          {site.name}
        </Link>
      </header>
      <main className="profile__body">
        <p className="profile__missing">
          No one under that name. <Link href="/app">Back</Link>
        </p>
      </main>
    </div>
  );
}
