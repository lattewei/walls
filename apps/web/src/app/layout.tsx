import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { Shell } from "@/components/shell";
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
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
