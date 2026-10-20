import { expect, it } from "vitest";
import { databaseTarget } from "../../../scripts/database-target.mjs";
const developmentHost = "ep-cool-frog-a1p9ey1s.ap-southeast-1.aws.neon.tech";
const labels = {
  NEON_PROJECT_ID: "round-darkness-78734677",
  NEON_BRANCH_ID: "br-odd-pine-a1pw77e9",
};
const url = (host, path = "/oathfront") =>
  `postgresql://test:test@${host}${path}`;
for (const command of ["migrate", "runtime"]) {
  it(`${command} allows the verified direct development endpoint before connection`, () => {
    for (const host of [developmentHost, developmentHost + ":5432"])
      expect(
        databaseTarget(command, {
          ...labels,
          DATABASE_URL_UNPOOLED: url(
            host,
            "/oathfront?sslmode=verify-full&channel_binding=require",
          ),
        }).hostname,
      ).toBe(developmentHost);
  });
  for (const host of [
    "ep-dawn-fog-a1urq6is.ap-southeast-1.aws.neon.tech",
    "ep-arbitrary.ap-southeast-1.aws.neon.tech",
    "ep-cool-frog-a1p9ey1s.us-east-1.aws.neon.tech",
    "ep-cool-frog-a1p9ey1s-pooler.ap-southeast-1.aws.neon.tech",
    "127.0.0.1",
    "example.com",
    developmentHost + ":6543",
  ]) {
    it(`${command} rejects ${host} despite authorized development labels`, () => {
      expect(() =>
        databaseTarget(command, {
          ...labels,
          DATABASE_URL_UNPOOLED: url(host),
        }),
      ).toThrow();
    });
  }
  it(`${command} rejects branch/project or database mismatch`, () => {
    expect(() =>
      databaseTarget(command, {
        ...labels,
        NEON_BRANCH_ID: "br-old-boat-a1irt1i9",
        DATABASE_URL_UNPOOLED: url(developmentHost),
      }),
    ).toThrow();
    expect(() =>
      databaseTarget(command, {
        ...labels,
        NEON_PROJECT_ID: "other-project",
        DATABASE_URL_UNPOOLED: url(developmentHost),
      }),
    ).toThrow();
    expect(() =>
      databaseTarget(command, {
        ...labels,
        DATABASE_URL_UNPOOLED: url(developmentHost, "/other"),
      }),
    ).toThrow();
  });
  it(`${command} rejects query parameters that override the validated endpoint or database`, () => {
    for (const query of [
      "host=ep-dawn-fog-a1urq6is.ap-southeast-1.aws.neon.tech",
      "database=other",
      "options=endpoint%3Dep-dawn-fog-a1urq6is",
    ])
      expect(() =>
        databaseTarget(command, {
          ...labels,
          DATABASE_URL_UNPOOLED: url(developmentHost) + "?" + query,
        }),
      ).toThrow();
  });
}
for (const host of ["127.0.0.1", "localhost"])
  it(`local allows explicitly marked loopback *_test database on ${host}`, () => {
    expect(
      databaseTarget("local", {
        OATHFRONT_TEST_DATABASE: "1",
        TEST_DATABASE_URL_UNPOOLED: url(host + ":55432", "/oathfront_test"),
      }).hostname,
    ).toBe(host);
  });
it("local rejects remote hosts, missing test authorization and non-test databases", () => {
  for (const env of [
    {
      OATHFRONT_TEST_DATABASE: "1",
      TEST_DATABASE_URL_UNPOOLED: url(developmentHost, "/oathfront_test"),
    },
    { TEST_DATABASE_URL_UNPOOLED: url("127.0.0.1", "/oathfront_test") },
    {
      OATHFRONT_TEST_DATABASE: "1",
      TEST_DATABASE_URL_UNPOOLED: url("127.0.0.1", "/oathfront"),
    },
    {
      OATHFRONT_TEST_DATABASE: "1",
      TEST_DATABASE_URL_UNPOOLED:
        url("127.0.0.1", "/oathfront_test") + "?host=production.example",
    },
  ])
    expect(() => databaseTarget("local", env)).toThrow();
});
it("rejects unsupported commands and malformed or non-PostgreSQL URLs without disclosing their input", () => {
  expect(() =>
    databaseTarget("invalid", {
      ...labels,
      DATABASE_URL_UNPOOLED: url(developmentHost),
    }),
  ).toThrow();
  expect(() =>
    databaseTarget("migrate", {
      ...labels,
      DATABASE_URL_UNPOOLED: "https://" + developmentHost + "/oathfront",
    }),
  ).toThrow();
  expect(() =>
    databaseTarget("migrate", {
      ...labels,
      DATABASE_URL_UNPOOLED: "private-malformed-value",
    }),
  ).toThrow("Invalid database URL");
});
