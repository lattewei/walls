import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { StudioShell } from "@/components/studio/shell";
import { site } from "@/content/site";

import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: site.name,
  description: site.subhead,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="font-[family-name:var(--font-sans)] antialiased">
        <StudioShell>{children}</StudioShell>
      </body>
    </html>
  );
}
