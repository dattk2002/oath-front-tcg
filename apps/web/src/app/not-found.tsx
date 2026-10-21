import Link from "next/link";
export default function NotFound() {
  return (
    <main className="status-panel">
      <h1>Page not found</h1>
      <Link href="/">Back home</Link>
    </main>
  );
}
