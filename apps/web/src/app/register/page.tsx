import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Create account · ${site.name}`,
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
