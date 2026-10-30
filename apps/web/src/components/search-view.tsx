"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";
import { IconNavSearch } from "./icons";

export const categories = [
  { name: "Drill", color: "#1f8a4c" },
  { name: "Trap", color: "#e2b400" },
  { name: "R&B", color: "#7b4fd6" },
  { name: "Hip-Hop", color: "#3d7cff" },
  { name: "Pop", color: "#e23b8b" },
  { name: "Afro", color: "#e4572e" },
  { name: "Jersey", color: "#f04b6a" },
  { name: "Rage", color: "#d23b3b" },
  { name: "Plugg", color: "#5b4bdb" },
  { name: "Dance", color: "#1aa36a" },
  { name: "Ambient", color: "#4b6d8a" },
  { name: "Latin", color: "#e23b6a" },
  { name: "Rock", color: "#e85d2c" },
  { name: "Electronic", color: "#6b4ce0" },
  { name: "Soul", color: "#c45b2a" },
] as const;

export type SearchHit = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
};

export function SearchView({
  query,
  artists,
  producers,
}: {
  query: string;
  artists: SearchHit[];
  producers: SearchHit[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = draft.trim();
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : "/search");
  }

  const searching = query.length > 0;

  return (
    <div className="browse">
      <form className="browse__bar" onSubmit={submit} role="search">
        <label className="browse__field">
          <IconNavSearch />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            autoFocus
          />
        </label>
      </form>

      {searching ? (
        <>
          <section className="browse__block">
            <h2>Walls</h2>
            {artists.length === 0 ? (
              <p className="browse__empty">No walls for “{query}”.</p>
            ) : (
              <ul className="browse__hits">
                {artists.map((hit) => (
                  <li key={hit.id}>
                    <Link href={hit.href}>
                      <Thumb hit={hit} />
                      <span>
                        <strong>{hit.title}</strong>
                        <em>{hit.subtitle}</em>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="browse__block">
            <h2>Producers</h2>
            {producers.length === 0 ? (
              <p className="browse__empty">No producers for “{query}”.</p>
            ) : (
              <ul className="browse__hits">
                {producers.map((hit) => (
                  <li key={hit.id}>
                    <Link href={hit.href}>
                      <Thumb hit={hit} />
                      <span>
                        <strong>{hit.title}</strong>
                        <em>{hit.subtitle}</em>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="browse__block">
            <h2>Browse Categories</h2>
            <ul className="browse__cats">
              {categories.map((cat) => (
                <li key={cat.name}>
                  <Link
                    href={`/search?q=${encodeURIComponent(cat.name)}`}
                    className="browse__cat"
                    style={{ background: cat.color }}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Thumb({ hit }: { hit: { title: string; image?: string } }) {
  return (
    <span className="browse__thumb" aria-hidden>
      {hit.image ? <img src={apiUrl(hit.image)} alt="" /> : hit.title.slice(0, 1).toUpperCase()}
    </span>
  );
}
