import { it, expect } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
it("redacts malformed database credentials and refuses absent server secret before startup", async () => {
  const artifact = fileURLToPath(
    new URL("../dist/server.mjs", import.meta.url),
  );
  for (const config of [
    {
      DATABASE_URL: "postgresql://user:STARTUP_CREDENTIAL_CANARY@[",
      SESSION_SECRET: "a".repeat(64),
    },
    {
      DATABASE_URL:
        "postgresql://user:STARTUP_CREDENTIAL_CANARY@localhost/test",
      SESSION_SECRET: "",
    },
  ]) {
    const child = spawn(process.execPath, [artifact], {
      env: { ...process.env, ...config, APP_ORIGIN: "https://oathfront.test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (c) => {
      output += String(c);
    });
    child.stderr.on("data", (c) => {
      output += String(c);
    });
    const [code] = await once(child, "exit");
    expect(code).toBe(1);
    expect(output).not.toContain("STARTUP_CREDENTIAL_CANARY");
    expect(output).not.toContain("listening");
  }
});
