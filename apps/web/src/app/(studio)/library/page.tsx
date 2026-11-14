import type { Metadata } from "next";

import { MyUploads } from "@/components/my-uploads";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `My uploads · ${site.name}`,
};

export default function LibraryPage() {
  return <MyUploads />;
}
