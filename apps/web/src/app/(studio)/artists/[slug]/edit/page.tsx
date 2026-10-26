import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditWallForm } from "@/components/edit-wall-form";
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
    return { title: `Edit ${artist.name} · ${site.name}` };
  } catch {
    return { title: site.name };
  }
}

export default async function EditWallPage({ params }: Props) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) notFound();

  return <EditWallForm artist={artist} />;
}
