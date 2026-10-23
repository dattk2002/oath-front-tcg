export interface RealtimeConfig {
  url: string;
  /** The same restricted runtime DSN used by the normal pooled queries. */
  databaseUrl: string;
}
export function realtimeUrl(value: string): string {
  const url = new URL(value);
  if (
    !["ws:", "wss:"].includes(url.protocol) ||
    url.pathname !== "/realtime/matches" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    url.href !== value
  )
    throw Error("Explicit public realtime endpoint required");
  return value;
}
/** LISTEN requires a dedicated direct connection, with the runtime role and TLS preserved. */
export function listenerDatabaseUrl(value: string): string {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw Error("PostgreSQL runtime URL required");
  const local = ["127.0.0.1", "localhost", "db"].includes(url.hostname);
  if (!local) {
    if (
      !url.hostname.endsWith(".neon.tech") ||
      !url.hostname.includes("-pooler.")
    )
      throw Error("Pooled Neon runtime URL required");
    url.hostname = url.hostname.replace("-pooler.", ".");
  }
  return url.href;
}
