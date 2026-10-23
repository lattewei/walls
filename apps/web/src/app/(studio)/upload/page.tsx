import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProdForm } from "@/components/upload-prod-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Upload · ${site.name}`,
};

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="wall-form">
          <p className="wall-form__hint">Loading…</p>
        </div>
      }
    >
      <UploadProdForm />
    </Suspense>
  );
}
