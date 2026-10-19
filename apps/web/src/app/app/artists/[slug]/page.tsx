"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Album } from "@/components/studio/album";
import { getWall } from "@/content/library";

export default function WallPage() {
  const slug = String(useParams().slug ?? "");
  const wall = getWall(slug);

  if (!wall) {
    return (
      <p className="missing">
        No wall under that name. <Link href="/app">Back</Link>
      </p>
    );
  }

  return <Album wall={wall} />;
}
