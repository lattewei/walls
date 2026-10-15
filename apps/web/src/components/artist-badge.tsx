import type { PublicArtist } from "@/lib/types";

export function ArtistBadge({ artist }: { artist: Pick<PublicArtist, "badge" | "is_official"> }) {
  if (artist.is_official) {
    return (
      <span className="inline-flex items-center rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-400">
        Official
      </span>
    );
  }
  if (artist.badge === "pending_claim") {
    return (
      <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-400/90">
        Claim pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
      Community
    </span>
  );
}
