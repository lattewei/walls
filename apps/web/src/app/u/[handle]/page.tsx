"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorBanner, PageTitle } from "@/components/ui";
import { ApiClientError, api } from "@/lib/api";
import type { PublicContacts, PublicUser } from "@/lib/types";

export default function PublicUserPage() {
  const params = useParams();
  const handle = String(params.handle ?? "");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [contacts, setContacts] = useState<PublicContacts | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getUser(handle);
        if (cancelled) return;
        setUser(res.user);
        setContacts(res.contacts);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiClientError ? err.message : "User not found",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (error || !user) {
    return <ErrorBanner>{error || "Not found"}</ErrorBanner>;
  }

  const links = [
    contacts?.public_contact_email
      ? {
          label: "Email",
          href: `mailto:${contacts.public_contact_email}`,
          text: contacts.public_contact_email,
        }
      : null,
    contacts?.instagram_url
      ? {
          label: "Instagram",
          href: contacts.instagram_url,
          text: contacts.instagram_url,
        }
      : null,
    ...(contacts?.other_links ?? []).map((l) => ({
      label: l.label,
      href: l.url,
      text: l.url,
    })),
  ].filter(Boolean) as { label: string; href: string; text: string }[];

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle
        title={user.display_name}
        subtitle={`@${user.handle}${user.bio ? ` · ${user.bio}` : ""}`}
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Contact
      </h2>
      {links.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No public contacts published yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="block rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:border-zinc-700"
              >
                <span className="text-zinc-500">{l.label}</span>
                <div className="truncate text-amber-400">{l.text}</div>
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-zinc-600">
        <Link href="/artists" className="text-zinc-400 hover:text-zinc-200">
          Browse artists
        </Link>
      </p>
    </div>
  );
}
