import Link from "next/link";

export default function UserNotFound() {
  return (
    <div className="wall">
      <p className="wall__missing">
        No producer under that handle. <Link href="/app">Back</Link>
      </p>
    </div>
  );
}
