import type { Metadata } from "next";

import { StudioShell } from "@/components/studio/shell";
import { RoomProvider } from "@/components/studio/room";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: site.name,
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RoomProvider>
      <StudioShell>{children}</StudioShell>
    </RoomProvider>
  );
}
