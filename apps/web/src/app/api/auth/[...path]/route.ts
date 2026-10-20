import { createNeonAuth } from "@neondatabase/auth/next/server";
import type { NextRequest } from "next/server";
let auth: ReturnType<typeof createNeonAuth> | undefined;
function handler() {
  const { NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET } = process.env;
  if (!NEON_AUTH_BASE_URL || !NEON_AUTH_COOKIE_SECRET) return null;
  auth ??= createNeonAuth({
    baseUrl: NEON_AUTH_BASE_URL,
    cookies: { secret: NEON_AUTH_COOKIE_SECRET },
    logLevel: "silent",
  });
  return auth.handler();
}
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return (
    handler()?.GET(request, context) ??
    Response.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 })
  );
}
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return (
    handler()?.POST(request, context) ??
    Response.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 })
  );
}
