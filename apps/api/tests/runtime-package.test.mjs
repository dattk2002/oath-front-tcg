import { it, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
it("runs pg and Ajv from the frozen external dependency closure without workspace/dev aliases", async () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const target = (await mkdtemp(tmpdir() + "/oathfront-package-")) + "/runtime";
  execFileSync(process.execPath, ["scripts/package-api-runtime.mjs", target], {
    cwd: root,
  });
  const result = execFileSync(
    process.execPath,
    [
      "-e",
      'const {createRequire}=require("node:module");const req=createRequire(process.cwd()+"/package.json");const Ajv=req("ajv");const check=new Ajv().compile({type:"integer"});console.log(JSON.stringify({isolated:req.resolve("pg").startsWith(process.cwd()+"/node_modules/"),pool:typeof req("pg").Pool,socket:typeof req("ws").WebSocketServer,valid:check(7),invalid:check("7")}))',
    ],
    { cwd: target, encoding: "utf8" },
  );
  expect(JSON.parse(result)).toEqual({
    isolated: true,
    pool: "function",
    socket: "function",
    valid: true,
    invalid: false,
  });
  const dependencies = JSON.parse(
    await readFile(target + "/runtime-dependencies.json", "utf8"),
  );
  expect(
    dependencies.some((p) => p.name === "typescript" || p.name === "next"),
  ).toBe(false);
});
