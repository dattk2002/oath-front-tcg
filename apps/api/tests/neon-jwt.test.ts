import { expect, it } from "vitest";
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from "jose";
import { neonJwtVerifier } from "../src/auth/neon-jwt.js";
it("accepts only signed managed EdDSA identity with exact origin issuer/audience, subject and bounded expiry", async () => {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA");
  const issuer = "https://auth.example.test",
    now = Math.floor(Date.now() / 1000);
  const verify = neonJwtVerifier({
    baseUrl: issuer + "/neondb/auth",
    jwksUrl: issuer + "/neondb/auth/jwks",
    key: createLocalJWKSet({
      keys: [{ ...(await exportJWK(publicKey)), kid: "test", alg: "EdDSA" }],
    }),
  });
  const token = async (fields: Record<string, unknown> = {}) =>
    new SignJWT({
      sub: "account",
      iss: issuer,
      aud: issuer,
      iat: now,
      exp: now + 900,
      ...fields,
    })
      .setProtectedHeader({ alg: "EdDSA", kid: "test" })
      .sign(privateKey);
  expect((await verify(await token())).subject).toBe("account");
  for (const fields of [
    { iss: issuer + "/neondb/auth" },
    { aud: "other" },
    { exp: now - 1 },
    { sub: "" },
    { exp: now + 901 },
    { is_anonymous: true },
  ])
    await expect(verify(await token(fields))).rejects.toMatchObject({
      status: 401,
    });
  const forged = (await token()).split(".");
  forged[1] = Buffer.from(
    JSON.stringify({
      sub: "attacker",
      iss: issuer,
      aud: issuer,
      iat: now,
      exp: now + 900,
    }),
  ).toString("base64url");
  await expect(verify(forged.join("."))).rejects.toMatchObject({ status: 401 });
});
