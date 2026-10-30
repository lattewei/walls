import type { Metadata } from "next";

import { Shell } from "@/components/shell";
import { site } from "@/content/site";

import "./globals.css";
import "./apple.css";

export const metadata: Metadata = {
  title: site.name,
  description: site.subhead,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("walls_theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
