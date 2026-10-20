import type { Metadata } from "next";

import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `${site.name} — Home`,
};

export default function AppSectionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
