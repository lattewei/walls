"use client";

import Link from "next/link";

import { useSessionUser } from "@/lib/session";

export function EditProfileGate({ handle }: { handle: string }) {
  const user = useSessionUser();
  if (!user || user.handle !== handle) return null;

  return (
    <Link href="/settings" className="profile__action profile__action--ghost">
      Edit profile
    </Link>
  );
}
