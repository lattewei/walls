import type { Metadata } from "next";

import { AdminConsole } from "@/components/admin-console";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Moderation · ${site.name}`,
};

export default function AdminPage() {
  return <AdminConsole />;
}
