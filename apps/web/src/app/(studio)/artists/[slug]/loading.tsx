export default function WallLoading() {
  return (
    <div className="wall" aria-busy="true">
      <section className="wall__head">
        <span className="skel skel--cover" />
        <div className="wall__intro">
          <span className="skel skel--title" />
          <span className="skel skel--line" />
          <span className="skel skel--line" />
        </div>
      </section>
      <span className="skel skel--line" />
      <span className="skel skel--line" />
      <span className="skel skel--line" />
    </div>
  );
}
