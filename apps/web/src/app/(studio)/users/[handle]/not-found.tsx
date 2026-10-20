import Link from "next/link";

export default function UserNotFound() {
  return (
    <div className="profile">
      <p className="profile__missing">
        No one under that name. <Link href="/app">Back</Link>
      </p>
    </div>
  );
}
