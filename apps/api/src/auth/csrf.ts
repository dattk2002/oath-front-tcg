import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "../http.js";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest();
export const csrfToken = (token: string, secret: string) =>
  createHmac("sha256", secret)
    .update("oathfront:csrf:v1\0")
    .update(token)
    .digest("base64url");
export function equalHash(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}
export function requireOrigin(origin: unknown, allowed: string) {
  if (origin !== allowed) throw new HttpError(403, "CSRF");
}
export function requireCsrf(header: unknown, expected: Buffer) {
  if (typeof header !== "string" || !equalHash(digest(header), expected))
    throw new HttpError(403, "CSRF");
}
