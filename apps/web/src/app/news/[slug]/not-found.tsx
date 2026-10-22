import Link from "next/link";
export default function NotFound() {
  return (
    <main className="event-archive-note">
      <h1>Article not found</h1>
      <p>This story is not published or no longer exists.</p>
      <Link href="/news">All news</Link>
    </main>
  );
}
