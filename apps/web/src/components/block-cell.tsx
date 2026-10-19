import Link from "next/link";

import type { AppBlock } from "@/content/app-home";
import { coverStyle, initials } from "@/lib/cover";

export function BlockCell({ block }: { block: AppBlock }) {
  const seed = block.seed || block.id;
  const disabled = block.href === "#";

  const inner = (
    <>
      <div className="block-cell__face" style={block.image ? undefined : coverStyle(seed)}>
        {block.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={block.image} alt="" className="block-cell__img" />
        ) : (
          <span className="block-cell__mark">{initials(block.title)}</span>
        )}
        <div className="block-cell__dither" aria-hidden />
      </div>
      <div className="block-cell__meta">
        <div className="block-cell__title">{block.title}</div>
        {block.subtitle ? (
          <div className="block-cell__sub">{block.subtitle}</div>
        ) : null}
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className="block-cell block-cell--soon" aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link href={block.href} className="block-cell">
      {inner}
    </Link>
  );
}
