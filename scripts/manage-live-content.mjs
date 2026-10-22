#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createPool } from "../packages/db/src/connection.ts";
import {
  liveBundle,
  validateLiveBundle,
  previewLiveContent,
  importLiveContent,
  publishLiveContent,
  bootstrapStatements,
  ContentAdminError,
} from "../apps/api/src/editorial/admin.ts";
import { contentHash } from "../packages/game-content/src/events/season-one.ts";

export async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      file: { type: "string" },
      out: { type: "string" },
      target: { type: "string" },
      branch: { type: "string" },
      database: { type: "string" },
      kind: { type: "string", default: "post" },
      id: { type: "string" },
      at: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    process.stdout.write(
      "Usage: node --import tsx scripts/manage-live-content.mjs <validate|dry-run|import|publish|export-json|export-sql> [--file bundle.json] [--target local|development] [--database name] [--branch id] [--kind post|event --id slug --at ISO] [--out path]\n",
    );
    return;
  }
  if (
    positionals.length !== 1 ||
    ![
      "validate",
      "dry-run",
      "import",
      "publish",
      "export-json",
      "export-sql",
    ].includes(positionals[0])
  )
    throw new ContentAdminError("INVALID_TARGET", "command");
  const command = positionals[0],
    bundle = validateLiveBundle(
      values.file
        ? JSON.parse(await readFile(values.file, "utf8"))
        : liveBundle,
    );
  if (command === "validate") {
    process.stdout.write(
      JSON.stringify({
        valid: true,
        posts: bundle.posts.length,
        events: bundle.events.length,
        scenarios: bundle.scenarios.length,
        sha256: contentHash(bundle),
      }) + "\n",
    );
    return;
  }
  if (command === "export-json" || command === "export-sql") {
    if (!values.out) throw new ContentAdminError("INVALID_TARGET", "output");
    const text =
      command === "export-json"
        ? JSON.stringify(bundle, null, 2) + "\n"
        : "BEGIN;\n" + bootstrapStatements(bundle).join("\n") + "\nCOMMIT;\n";
    await writeFile(values.out, text, { flag: "wx" });
    process.stdout.write(
      JSON.stringify({
        exported: true,
        format: command === "export-json" ? "json" : "sql",
        sha256: contentHash(bundle),
      }) + "\n",
    );
    return;
  }
  if (!["local", "development"].includes(values.target))
    throw new ContentAdminError("INVALID_TARGET", "target");
  const raw = process.env.OATHFRONT_CONTENT_DATABASE_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ContentAdminError("INVALID_TARGET", "connection");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new ContentAdminError("INVALID_TARGET", "connection");
  const database = decodeURIComponent(url.pathname.slice(1));
  if (values.database && database !== values.database)
    throw new ContentAdminError("INVALID_TARGET", "database");
  if (values.target === "local") {
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !(database === "oathfront_interactive" || database.endsWith("_test"))
    )
      throw new ContentAdminError("INVALID_TARGET", "local database");
  } else if (
    !url.hostname.endsWith(".neon.tech") ||
    url.hostname.includes("-pooler.") ||
    process.env.OATHFRONT_CONTENT_ENVIRONMENT !== "development" ||
    !values.branch ||
    values.branch !== process.env.OATHFRONT_NEON_BRANCH_ID
  )
    throw new ContentAdminError("INVALID_TARGET", "development branch");
  const db = createPool({ connectionString: url.href, purpose: "migration" });
  try {
    let report;
    if (command === "dry-run") report = await previewLiveContent(db, bundle);
    else if (command === "import") report = await importLiveContent(db, bundle);
    else {
      if (!values.id || !values.at || !["post", "event"].includes(values.kind))
        throw new ContentAdminError("INVALID_TARGET", "publication");
      report = await publishLiveContent(
        db,
        values.kind,
        values.id,
        new Date(values.at),
        new Date(),
      );
    }
    process.stdout.write(
      JSON.stringify({ target: values.target, ...report }) + "\n",
    );
  } finally {
    await db.end();
  }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  main().catch((error) => {
    // Driver diagnostics can contain connection data. Only our controlled codes/IDs are printable.
    process.stderr.write(
      JSON.stringify(
        error instanceof ContentAdminError
          ? { error: error.code, resource: error.resource }
          : { error: "LIVE_CONTENT_COMMAND_FAILED" },
      ) + "\n",
    );
    process.exitCode = 1;
  });
