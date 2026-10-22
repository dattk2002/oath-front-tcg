// Vercel traces this compiled bundle instead of TypeScript workspace exports.
export { default } from "./dist/hosted.mjs";
export const config = { maxDuration: 30 };
