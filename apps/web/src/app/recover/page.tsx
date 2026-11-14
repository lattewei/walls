import type { Metadata } from "next";

import { RecoverForm } from "@/components/recover-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Recover account · ${site.name}`,
};

export default function RecoverPage() {
  return <RecoverForm />;
}
