import Link from "next/link";

import type { AppBlock } from "@/content/app-home";
import { painting } from "@/content/app-home";

export function BlockCell({ block }: { block: AppBlock }) {
  return (
    <Link href={block.href} className="cell">
      <div className="cell__sq">
        {block.kind === "crop" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={painting}
            alt=""
            style={{ objectPosition: block.crop ?? "50% 50%" }}
          />
        ) : (
          <p>{block.title}</p>
        )}
      </div>
      <div className="cell__cap">
        <span>{block.title}</span>
        <span>{block.meta}</span>
      </div>
    </Link>
  );
}
