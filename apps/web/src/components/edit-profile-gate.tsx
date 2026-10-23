"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getStoredUser } from "@/lib/auth";

export function EditProfileGate({ handle }: { handle: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setShow(Boolean(u && u.handle === handle));
  }, [handle]);

  if (!show) return null;

  return (
    <Link href="/settings" className="profile__action profile__action--ghost">
      Edit profile
    </Link>
  );
}
