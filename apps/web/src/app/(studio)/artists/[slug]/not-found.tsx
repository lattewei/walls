import Link from "next/link";

export default function WallNotFound() {
  return (
    <div className="wall">
      <p className="wall__missing">
        No wall under that name. <Link href="/app">Back</Link>
      </p>
    </div>
  );
}
