import type { Metadata } from "next";

import { StudioShell } from "@/components/studio/shell";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `${site.name} — Home`,
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <StudioShell>{children}</StudioShell>;
}
