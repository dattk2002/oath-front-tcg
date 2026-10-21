import type { FastifyReply } from "fastify";
/** Native Fastify handlerTimeout bounds HTTP; this tracks uncancelled accepted work until settlement. */
export function mutationLifetime(
  handlerTimeout = 5000,
  extendLifetime?: (work: Promise<unknown>) => void,
) {
  if (
    !Number.isSafeInteger(handlerTimeout) ||
    handlerTimeout < 1 ||
    handlerTimeout > 5000
  )
    throw new TypeError("Invalid command response deadline");
  const inFlightMutations = new Set<Promise<unknown>>();
  async function respond<T>(
    reply: FastifyReply,
    operation: () => Promise<T>,
    status = 200,
  ) {
    const work = Promise.resolve().then(operation);
    inFlightMutations.add(work);
    // Register while request context is active, before the response can time out.
    extendLifetime?.(
      work.then(
        () => undefined,
        () => undefined,
      ),
    );
    void work.then(
      () => inFlightMutations.delete(work),
      () => inFlightMutations.delete(work),
    );
    try {
      const result = await work;
      // The native timeout may already have sent canonical503. Never send a second response.
      if (!reply.sent) return reply.code(status).send(result);
    } catch (error) {
      // Consume late failures without framework logging raw DB exceptions or request data.
      if (!reply.sent) throw error;
    }
  }
  return {
    handlerTimeout,
    respond,
    inFlightMutations,
    async drain() {
      await Promise.allSettled(inFlightMutations);
    },
  };
}
