export default function HomeLoading() {
  return (
    <div className="am-page" aria-busy="true">
      <span className="skel skel--title" />
      <div className="am-feature">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className="skel am-card" />
        ))}
      </div>
    </div>
  );
}