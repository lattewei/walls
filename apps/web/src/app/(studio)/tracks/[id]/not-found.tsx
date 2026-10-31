import Link from "next/link";

export default function TrackNotFound() {
  return (
    <div className="wall">
      <p className="wall__missing">
        That production is gone. <Link href="/app">Back</Link>
      </p>
    </div>
  );
}
