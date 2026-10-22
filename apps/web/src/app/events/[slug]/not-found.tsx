import Link from "next/link";
export default function NotFound() {
  return (
    <main className="event-archive-note">
      <h1>Event not found</h1>
      <p>This event is not published or does not exist.</p>
      <Link href="/events">All events</Link>
    </main>
  );
}
