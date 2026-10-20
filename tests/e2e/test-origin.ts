export const testPort = Number(process.env.OATHFRONT_E2E_PORT ?? 3200);
if (
  !Number.isInteger(testPort) ||
  testPort < 1024 ||
  testPort > 65535 ||
  [3000, 3001, 3101].includes(testPort)
)
  throw new Error("Invalid isolated browser fixture port");
export const testOrigin = `http://localhost:${testPort}`;
