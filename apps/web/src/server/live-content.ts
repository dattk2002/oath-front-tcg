import { cache } from "react";
import { validateBrowserWire } from "@oathfront/contracts/browser";
import type { WireDefinitions } from "@oathfront/contracts/browser";
/** Public SSR lookup for metadata and actual HTTP 404s. Never forwards an account cookie. */
async function read<K extends "NewsPost" | "EventDetail">(
  section: "news" | "events",
  slug: string,
  definition: K,
): Promise<
  | { status: "ok"; data: WireDefinitions[K] }
  | { status: "missing" | "unavailable" }
> {
  try {
    const upstream = new URL(
      process.env.API_UPSTREAM_ORIGIN ??
        process.env.API_ORIGIN ??
        "http://127.0.0.1:3001",
    );
    if (
      upstream.username ||
      upstream.password ||
      upstream.pathname !== "/" ||
      !["http:", "https:"].includes(upstream.protocol)
    )
      return { status: "unavailable" };
    upstream.pathname = `/api/v1/${section}/${encodeURIComponent(slug)}`;
    const secret = process.env.UI_PROXY_SECRET;
    const response = await fetch(upstream, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: secret
        ? {
            "x-oathfront-proxy-token": secret,
            "x-oathfront-client-ip": "127.0.0.1",
          }
        : {},
    });
    if (response.status === 404) return { status: "missing" };
    if (!response.ok) return { status: "unavailable" };
    const data: unknown = await response.json();
    return validateBrowserWire(definition, data)
      ? { status: "ok", data }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
export const readNewsPost = cache((slug: string) =>
  read("news", slug, "NewsPost"),
);
export const readWeeklyEvent = cache((slug: string) =>
  read("events", slug, "EventDetail"),
);
