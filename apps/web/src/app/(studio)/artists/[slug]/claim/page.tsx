import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClaimFlow } from "@/components/claim-flow";
import { site } from "@/content/site";
import { getArtist } from "@/lib/catalog";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const artist = await getArtist(slug);
    if (!artist) return { title: site.name };
    return { title: `Claim ${artist.name} · ${site.name}` };
  } catch {
    return { title: site.name };
  }
}

export default async function ClaimWallPage({ params }: Props) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) notFound();

  return (
    <ClaimFlow
      slug={artist.slug}
      name={artist.name}
      claimStatus={artist.claim_status}
    />
  );
}
