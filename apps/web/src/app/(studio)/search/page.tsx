import { SearchView, type SearchHit } from "@/components/search-view";
import { site } from "@/content/site";
import { isApiRequestError } from "@/lib/api";
import { listArtists, listProducers } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Search · ${site.name}`,
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams).q ?? "").trim();
  let artists: SearchHit[] = [];
  let producers: SearchHit[] = [];
  let error: string | null = null;

  if (query) {
    try {
      const [walls, people] = await Promise.all([
        listArtists(24, query),
        listProducers(24, query),
      ]);
      artists = walls.artists.map((artist) => ({
        id: artist.id,
        title: artist.name,
        subtitle: artist.is_official ? "Claimed wall" : "Community wall",
        href: `/artists/${artist.slug}`,
        image: artist.cover_url || artist.avatar_url || undefined,
      }));
      producers = people.producers.map((person) => ({
        id: person.id,
        title: person.display_name,
        subtitle: `@${person.handle}`,
        href: `/users/${person.handle}`,
        image: person.avatar_url || undefined,
      }));
    } catch (err) {
      error = isApiRequestError(err) ? err.message : "Could not search.";
    }
  }

  return (
    <div className="am-page">
      {error ? <p className="browse__empty">{error}</p> : null}
      <SearchView query={query} artists={artists} producers={producers} />
    </div>
  );
}
