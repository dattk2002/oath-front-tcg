/** A response deadline is not cancellation. Close HTTP/drain work before ending its pool. */
export async function shutdownWithin(
  close: () => Promise<unknown>,
  endPool: () => Promise<unknown>,
  deadlineMs = 10000,
): Promise<boolean> {
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1)
    throw new TypeError("Invalid shutdown deadline");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        await close();
        await endPool();
        return true;
      })(),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), deadlineMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
