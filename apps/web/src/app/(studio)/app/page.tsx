import Link from "next/link";

import { shelves } from "@/content/home";

export default function AppHome() {
  return (
    <div className="home">
      {shelves.map((shelf) => (
        <section key={shelf.id} id={shelf.id} className={`shelf shelf--${shelf.kind}`}>
          <h2>{shelf.title}</h2>
          <ul>
            {shelf.tiles.map((tile) => {
              const initial = tile.title.slice(0, 1).toUpperCase();
              const inner = (
                <>
                  <div className="tile__face">
                    {tile.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tile.image} alt={tile.title} />
                    ) : (
                      <span aria-hidden>{initial}</span>
                    )}
                  </div>
                  <p className="tile__title">{tile.title}</p>
                  <p className="tile__meta">{tile.meta}</p>
                </>
              );
              return (
                <li key={tile.id}>
                  {shelf.kind === "producer" ? (
                    <Link href={`/users/${tile.id}`} className="tile">
                      {inner}
                    </Link>
                  ) : (
                    <article className="tile">{inner}</article>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
