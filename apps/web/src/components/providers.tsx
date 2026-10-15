"use client";

import { AuthProvider } from "@/lib/auth";
import { PlayerProvider } from "@/lib/player";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlayerProvider>{children}</PlayerProvider>
    </AuthProvider>
  );
}
