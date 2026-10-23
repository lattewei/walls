import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Log in · ${site.name}`,
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth">
          <p className="auth__hint">Loading…</p>
        </div>
      }
    >
      <AuthForm mode="login" />
    </Suspense>
  );
}
