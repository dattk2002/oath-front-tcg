import { forwardApi } from "../../../../server/api-proxy.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  if (process.env.OATHFRONT_HOSTED_PROXY !== "1")
    return new Response(null, { status: 404 });
  return forwardApi(request, (await context.params).path, {
    upstream: process.env.API_UPSTREAM_ORIGIN ?? "",
    secret: process.env.UI_PROXY_SECRET ?? "",
    platform: process.env.VERCEL === "1",
  });
}
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as HEAD,
};
