import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
const owner = randomBytes(32).toString("hex"),
  runtime = randomBytes(32).toString("hex");
writeFileSync(
  ".env.test.local",
  `OATHFRONT_TEST_DATABASE=1\nOATHFRONT_DB_OWNER_PASSWORD=${owner}\nOATHFRONT_DB_RUNTIME_PASSWORD=${runtime}\nTEST_DATABASE_URL_UNPOOLED=postgresql://oathfront_migrator:${owner}@127.0.0.1:55432/oathfront_test\nTEST_DATABASE_URL=postgresql://oathfront_runtime:${runtime}@127.0.0.1:55432/oathfront_test\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Created .env.test.local mode0600 with random owner/runtime credentials; existing files are never overwritten",
);
