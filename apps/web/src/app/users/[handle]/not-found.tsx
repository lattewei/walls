import Link from "next/link";

import { StudioShell } from "@/components/studio/shell";

export default function UserNotFound() {
  return (
    <StudioShell compact>
      <div className="profile">
        <p className="profile__missing">
          No one under that name. <Link href="/app">Back</Link>
        </p>
      </div>
    </StudioShell>
  );
}
