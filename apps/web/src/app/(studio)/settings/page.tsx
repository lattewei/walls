import type { Metadata } from "next";

import { SettingsForm } from "@/components/settings-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Settings · ${site.name}`,
};

export default function SettingsPage() {
  return <SettingsForm />;
}
