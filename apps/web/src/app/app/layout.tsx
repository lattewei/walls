import type { Metadata } from "next";

import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `${site.name} — App`,
  description: "Artist walls and beatmakers",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
