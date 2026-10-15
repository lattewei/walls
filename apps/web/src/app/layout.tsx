import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PlayerBar } from "@/components/player-bar";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Open Studio",
  description:
    "Open artist pages. Upload beats tagged for an artist. Listen in-app. Contact the producer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <div className="flex min-h-[100dvh] flex-col">
            <SiteHeader />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-28">
              {children}
            </main>
            <PlayerBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
