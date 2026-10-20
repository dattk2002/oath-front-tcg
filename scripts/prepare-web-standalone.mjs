import { cp, access } from "node:fs/promises";
const web = new URL("../apps/web/", import.meta.url);
const output = new URL(".next/standalone/apps/web/", web);
await access(new URL("server.js", output));
await cp(new URL("public/", web), new URL("public/", output), {
  recursive: true,
});
await cp(new URL(".next/static/", web), new URL(".next/static/", output), {
  recursive: true,
});
