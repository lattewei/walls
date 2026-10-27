import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wall">
      <p className="wall__missing">
        That page is not here. <Link href="/app">Back to walls</Link>
      </p>
    </div>
  );
}
