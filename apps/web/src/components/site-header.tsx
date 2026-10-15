"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MusicNotesSimple, UploadSimple, User } from "@phosphor-icons/react";

import { useAuth } from "@/lib/auth";

const links = [
  { href: "/artists", label: "Artists" },
  { href: "/upload", label: "Upload", auth: true },
];

export function SiteHeader() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-zinc-50"
        >
          <MusicNotesSimple weight="fill" className="h-5 w-5 text-amber-400" />
          <span>Open Studio</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => {
            if (l.auth && !user) return null;
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-400 sm:hidden"
              >
                <UploadSimple className="h-4 w-4" weight="bold" />
                Upload
              </Link>
              <Link
                href="/me"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">@{user.handle}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-md px-2.5 py-1.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              >
                Log out
              </button>
            </>
          ) : !loading ? (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-400"
              >
                Join
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
