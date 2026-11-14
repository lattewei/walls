import type { Metadata } from "next";

import { WallActivity } from "@/components/wall-activity";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Wall activity · ${site.name}`,
};

export default function ActivityPage() {
  return <WallActivity />;
}
