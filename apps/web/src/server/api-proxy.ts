import { isIP } from "node:net";
/** Node-only same-origin proxy. Trust the platform IP only at the first Vercel ingress. */
export async function forwardApi(
  request: Request,
  path: string[],
  options: { upstream: string; secret: string; platform: boolean },
) {
  if (path.some((part) => part === "." || part === ".."))
    return new Response(null, { status: 404 });
  const unavailable = () =>
    Response.json(
      { error: "API_UNAVAILABLE" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  let upstream: URL;
  try {
    upstream = new URL(options.upstream);
  } catch {
    return unavailable();
  }
  if (
    !options.platform ||
    options.secret.length < 32 ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== "/" ||
    upstream.search ||
    upstream.hash ||
    (!["https:"].includes(upstream.protocol) &&
      !(
        process.env.NODE_ENV !== "production" &&
        upstream.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(upstream.hostname)
      ))
  )
    return unavailable();
  const ip = request.headers.get("x-vercel-forwarded-for");
  if (!ip || !isIP(ip)) return unavailable();
  const headers = new Headers(request.headers);
  for (const name of [
    "host",
    "connection",
    "transfer-encoding",
    "forwarded",
    "x-forwarded-for",
    "x-real-ip",
    "x-vercel-forwarded-for",
    "x-oathfront-client-ip",
    "x-oathfront-proxy-token",
  ])
    headers.delete(name);
  headers.set("x-oathfront-client-ip", ip);
  headers.set("x-oathfront-proxy-token", options.secret);
  upstream.pathname = "/api/v1/" + path.map(encodeURIComponent).join("/");
  upstream.search = new URL(request.url).search;
  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      ...(!["GET", "HEAD"].includes(request.method)
        ? { body: request.body, duplex: "half" as const }
        : {}),
      redirect: "manual",
      signal: AbortSignal.timeout(28000),
    });
    const outgoing = new Headers(response.headers);
    outgoing.delete("set-cookie");
    outgoing.delete("transfer-encoding");
    outgoing.delete("content-encoding");
    outgoing.delete("content-length");
    for (const value of response.headers.getSetCookie())
      outgoing.append("set-cookie", value);
    outgoing.set("cache-control", "no-store");
    return new Response(response.body, {
      status: response.status,
      headers: outgoing,
    });
  } catch {
    return unavailable();
  }
}
