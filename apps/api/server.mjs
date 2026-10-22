// Vercel traces this compiled bundle instead of TypeScript workspace exports.
// The Fastify adapter also requires an explicit import to detect this entrypoint.
import "fastify";
export { default } from "./dist/hosted.mjs";
export const config = { maxDuration: 30 };
