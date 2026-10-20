import { shelves } from "@/content/home";

export default function AppHome() {
  return (
    <div className="home">
      {shelves.map((shelf) => (
        <section key={shelf.id} id={shelf.id} className="shelf">
          <h2>{shelf.title}</h2>
          {shelf.tiles.length === 0 ? (
            <p className="shelf__empty">Nothing here yet.</p>
          ) : (
            <ul>
              {shelf.tiles.map((tile) => (
                <li key={tile.id}>
                  <article className="tile">
                    <div className="tile__sq">
                      {tile.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={tile.image} alt={tile.title} />
                      ) : (
                        <span>{tile.title.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <p className="tile__title">{tile.title}</p>
                    <p className="tile__meta">{tile.meta}</p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
