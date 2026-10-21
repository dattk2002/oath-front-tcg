export const testPort = Number(process.env.OATHFRONT_E2E_PORT ?? 3200);
if (
  !Number.isInteger(testPort) ||
  testPort < 1024 ||
  testPort > 65534 ||
  [3000, 3001, 3100, 3101].includes(testPort)
)
  throw new Error("Invalid isolated browser fixture port");
export const testOrigin = `http://localhost:${testPort}`;

export const testApiPort = Number(process.env.OATHFRONT_E2E_API_PORT ?? 3101);
if (
  !Number.isInteger(testApiPort) ||
  testApiPort < 1024 ||
  testApiPort > 65535 ||
  [3000, 3001, 3100, testPort, testPort + 1].includes(testApiPort)
)
  throw new Error("Invalid isolated browser API fixture port");
export const testApiOrigin = `http://127.0.0.1:${testApiPort}`;
