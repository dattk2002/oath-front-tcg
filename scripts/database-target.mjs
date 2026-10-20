const developmentHost = "ep-cool-frog-a1p9ey1s.ap-southeast-1.aws.neon.tech";
/** Resolve the authorized target before a pool or other database client exists. */
export function databaseTarget(command, env) {
  if (!["local", "migrate", "runtime"].includes(command))
    throw Error("Unsupported database command");
  const local = command === "local";
  const direct = local
    ? env.TEST_DATABASE_URL_UNPOOLED
    : env.DATABASE_URL_UNPOOLED;
  if (!direct) throw Error("Direct migration URL is required");
  let parsed;
  try {
    parsed = new URL(direct);
  } catch {
    throw Error("Invalid database URL");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol))
    throw Error("PostgreSQL URL required");
  // pg URL query parameters can override host/database or route an endpoint.
  // Only transport settings used by our verified Neon URLs are accepted.
  if (
    [...parsed.searchParams.keys()].some(
      (key) => !["sslmode", "channel_binding"].includes(key),
    )
  )
    throw Error("Refusing database URL connection overrides");
  if (local) {
    if (
      env.OATHFRONT_TEST_DATABASE !== "1" ||
      !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
      !parsed.pathname.endsWith("_test")
    )
      throw Error("Refusing non-local test setup");
  } else if (
    env.NEON_PROJECT_ID !== "round-darkness-78734677" ||
    env.NEON_BRANCH_ID !== "br-odd-pine-a1pw77e9" ||
    parsed.hostname !== developmentHost ||
    !["", "5432"].includes(parsed.port) ||
    parsed.pathname !== "/oathfront"
  )
    throw Error(
      "Refusing any target except the verified Neon development endpoint/database",
    );
  return parsed;
}
