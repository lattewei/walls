"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Sleeve } from "@/components/sleeve";
import { api, ApiClientError } from "@/lib/api";
import type { PublicContacts, PublicUser } from "@/lib/types";

export default function ProducerPage() {
  const handle = String(useParams().handle ?? "");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [contacts, setContacts] = useState<PublicContacts | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getUser(handle);
        if (cancelled) return;
        setUser(res.user);
        setContacts(res.contacts);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Not found");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (error) return <p className="text-sm text-[#e23b2f]">{error}</p>;
  if (!user) return <p className="text-sm text-[var(--ink-3)]">Loading…</p>;

  const links = [
    contacts?.public_contact_email
      ? { label: "Email", href: `mailto:${contacts.public_contact_email}` }
      : null,
    contacts?.instagram_url
      ? { label: "Instagram", href: contacts.instagram_url }
      : null,
    ...(contacts?.other_links ?? []).map((l) => ({ label: l.label, href: l.url })),
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr] md:items-start">
      <Sleeve seed={user.handle} label={user.display_name} className="aspect-square w-full" />
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-3)]">
          @{user.handle}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight">
          {user.display_name}
        </h1>
        {user.bio ? (
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--ink-2)]">{user.bio}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-2">
          {links.length === 0 ? (
            <p className="text-sm text-[var(--ink-3)]">No public contact yet.</p>
          ) : (
            links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="rounded-full border border-[var(--line)] px-4 py-2 text-sm hover:bg-white/5"
              >
                {l.label}
              </a>
            ))
          )}
        </div>
        <Link href="/artists" className="mt-10 inline-block text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
          Back to walls
        </Link>
      </div>
    </div>
  );
}
