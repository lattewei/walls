import Link from "next/link";

export default function WallNotFound() {
  return (
    <div className="profile">
      <p className="profile__missing">
        No wall under that name. <Link href="/app">Back</Link>
      </p>
    </div>
  );
}
