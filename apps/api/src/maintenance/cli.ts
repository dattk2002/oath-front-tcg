import { createPool, migrateDatabase } from "@oathfront/db";
import { runRetention } from "./retention.js";
import { inspectSupportedVersions } from "./versions.js";
const [command, cutoff] = process.argv.slice(2);
let pool: ReturnType<typeof createPool> | undefined;
try {
  if (
    !["retention", "versions", "migrate"].includes(command ?? "") ||
    !process.env.DATABASE_URL_UNPOOLED
  )
    throw Error(
      "Explicit maintenance operation and direct owner connection required",
    );
  pool = createPool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    purpose: "migration",
  });
  if (command === "retention") {
    if (!cutoff || !/^\d{4}-\d\d-\d\dT.*Z$/.test(cutoff))
      throw Error("Explicit UTC cutoff required");
    console.log(JSON.stringify(await runRetention(pool, new Date(cutoff))));
  } else if (command === "versions") {
    const report = await inspectSupportedVersions(pool);
    console.log(
      JSON.stringify({
        canRelease: report.canRelease,
        unsupportedCount: report.unsupported.length,
      }),
    );
    if (!report.canRelease) process.exitCode = 1;
  } else await migrateDatabase(pool, "packages/db/migrations");
} catch {
  console.error(
    "Maintenance failed; verify target, grants and release compatibility",
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
