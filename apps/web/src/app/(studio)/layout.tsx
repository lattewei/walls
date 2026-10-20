import { StudioShell } from "@/components/studio/shell";

export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <StudioShell>{children}</StudioShell>;
}
