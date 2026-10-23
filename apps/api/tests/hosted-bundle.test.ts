import { it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const exec = promisify(execFile);
it("cold-starts the hosted handler without workspace source or TypeScript exports", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "oathfront-hosted-"));
  const runtime = join(temporary, "runtime");
  try {
    await exec(process.execPath, ["scripts/package-api-runtime.mjs", runtime]);
    await cp("apps/api/dist/hosted.mjs", join(runtime, "hosted.mjs"));
    const { stdout } = await exec(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import server from './hosted.mjs';
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      try {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/health/live');
        console.log(JSON.stringify({status: response.status, body: await response.json()}));
      } finally { await new Promise(resolve => server.close(resolve)); }
    `,
      ],
      {
        cwd: runtime,
        env: { PATH: process.env.PATH ?? "", NODE_ENV: "production" },
        timeout: 10000,
      },
    );
    expect(JSON.parse(stdout)).toEqual({
      status: 503,
      body: { error: "API_UNAVAILABLE" },
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}, 20000);
