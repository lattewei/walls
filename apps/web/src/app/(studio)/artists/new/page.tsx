import type { Metadata } from "next";

import { CreateWallForm } from "@/components/create-wall-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Create a wall · ${site.name}`,
};

export default function NewWallPage() {
  return <CreateWallForm />;
}
