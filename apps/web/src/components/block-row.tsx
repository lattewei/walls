import type { AppRow } from "@/content/app-home";
import { BlockCell } from "./block-cell";

export function BlockRow({ row }: { row: AppRow }) {
  return (
    <section className="block-row">
      <header className="block-row__head">
        <h2 className="block-row__title">{row.title}</h2>
        {row.note ? <p className="block-row__note">{row.note}</p> : null}
      </header>
      <div className="block-row__scroller">
        <ul className="block-row__track">
          {row.blocks.map((block) => (
            <li key={block.id} className="block-row__item">
              <BlockCell block={block} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
