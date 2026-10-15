import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";

import { Shell } from "@/components/shell";
import { Providers } from "@/components/providers";

import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const text = Figtree({
  variable: "--font-text",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Studio",
  description: "Artist walls for beats. Listen in the browser. Contact the producer.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body className="font-[family-name:var(--font-text)] antialiased">
        <div className="grain" aria-hidden />
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
