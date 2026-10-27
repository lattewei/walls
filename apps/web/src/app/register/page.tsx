import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Create account · ${site.name}`,
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="auth">
          <p className="hint">Loading…</p>
        </div>
      }
    >
      <AuthForm mode="register" />
    </Suspense>
  );
}
