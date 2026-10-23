import { expect, it } from "vitest";
import { listenerDatabaseUrl, realtimeUrl } from "../src/realtime/config.js";
it("derives direct Neon LISTEN from restricted pooled credentials without changing TLS/database settings", () => {
  expect(
    listenerDatabaseUrl(
      "postgresql://runtime:example@ep-example-pooler.ap-southeast-1.aws.neon.tech/game?sslmode=require&channel_binding=require",
    ),
  ).toBe(
    "postgresql://runtime:example@ep-example.ap-southeast-1.aws.neon.tech/game?sslmode=require&channel_binding=require",
  );
  expect(
    listenerDatabaseUrl(
      "postgresql://runtime:example@127.0.0.1:5432/game_test",
    ),
  ).toBe("postgresql://runtime:example@127.0.0.1:5432/game_test");
  for (const url of [
    "https://localhost/db",
    "postgresql://runtime:example@ep-example.neon.tech/game",
    "postgresql://runtime:example@ep-example-pooler.attacker.test/game",
  ])
    expect(() => listenerDatabaseUrl(url)).toThrow();
});
it("accepts only the explicit socket endpoint, excluding query tokens, fragments and credentials", () => {
  expect(realtimeUrl("wss://api.example.test/realtime/matches")).toBe(
    "wss://api.example.test/realtime/matches",
  );
  for (const suffix of ["?token=x", "#secret", "/"])
    expect(() =>
      realtimeUrl("wss://api.example.test/realtime/matches" + suffix),
    ).toThrow();
  expect(() =>
    realtimeUrl("wss://user:pass@api.example.test/realtime/matches"),
  ).toThrow();
  expect(() =>
    realtimeUrl("https://api.example.test/realtime/matches"),
  ).toThrow();
});
