"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  MagnifyingGlass,
  UploadSimple,
  User,
} from "@phosphor-icons/react";

import { useAuth } from "@/lib/auth";
import { NowPlaying } from "./now-playing";

const nav = [
  { href: "/", label: "Listen", icon: House },
  { href: "/artists", label: "Artists", icon: MagnifyingGlass },
  { href: "/upload", label: "Upload", icon: UploadSimple },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const bare = pathname === "/login" || pathname === "/register";

  if (bare) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-[var(--line)] md:flex md:flex-col md:px-4 md:py-6">
        <Link
          href="/"
          className="px-3 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight"
        >
          Studio
        </Link>
        <p className="mt-1 px-3 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Open wall
        </p>
        <nav className="mt-10 flex flex-col gap-1">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-full px-3 py-2 text-sm transition duration-300 ${
                  active
                    ? "bg-white/10 text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:bg-white/5 hover:text-[var(--ink)]"
                }`}
              >
                <item.icon weight="light" className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-3 pb-24">
          {user ? (
            <div className="space-y-2">
              <Link
                href="/me"
                className="block truncate text-sm text-[var(--ink)] hover:underline"
              >
                @{user.handle}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-[var(--ink-3)] hover:text-[var(--ink)]"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Join
            </Link>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-4 pb-40 pt-6 md:px-10 md:pt-10">
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--line)] bg-[#0c0b0a]/92 px-2 py-2 backdrop-blur-md md:hidden">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] ${
                active ? "text-[var(--ink)]" : "text-[var(--ink-3)]"
              }`}
            >
              <item.icon weight={active ? "fill" : "light"} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href={user ? "/me" : "/login"}
          className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] text-[var(--ink-3)]"
        >
          <User weight="light" className="h-5 w-5" />
          {user ? "You" : "Join"}
        </Link>
      </nav>

      <NowPlaying />
    </div>
  );
}
