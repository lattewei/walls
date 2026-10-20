import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Log in · ${site.name}`,
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
