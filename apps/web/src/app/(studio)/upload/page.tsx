import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadForm } from "@/components/upload-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Upload · ${site.name}`,
};

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="sheet">
          <p className="hint">Loading…</p>
        </div>
      }
    >
      <UploadForm />
    </Suspense>
  );
}
