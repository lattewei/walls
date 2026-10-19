import type { AppRow } from "@/content/app-home";
import { BlockCell } from "./block-cell";

export function BlockRow({ row }: { row: AppRow }) {
  return (
    <section className="channel" id={row.id}>
      <header>
        <h2>{row.title}</h2>
        <span>{row.countLabel}</span>
      </header>
      {row.blocks.length === 0 ? (
        <p className="channel__empty">
          Nothing filed here yet. Shortlists and private rooms land in this channel later.
        </p>
      ) : (
        <ul>
          {row.blocks.map((block) => (
            <li key={block.id}>
              <BlockCell block={block} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
