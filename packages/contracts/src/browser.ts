import type { WireDefinitions } from "./generated/api-v1.js";
import validators from "./generated/browser-wire.js";
/** Static validators compiled from the canonical schema. No runtime code generation. */
export function validateBrowserWire<K extends keyof WireDefinitions>(
  definition: K,
  value: unknown,
): value is WireDefinitions[K] {
  return validators[definition](value);
}
export type * from "./generated/api-v1.js";
export function browserWireValidator<K extends keyof WireDefinitions>(
  definition: K,
) {
  return validators[definition];
}
export function serializeBrowserWire<K extends keyof WireDefinitions>(
  definition: K,
  value: unknown,
): string {
  if (!validateBrowserWire(definition, value))
    throw new TypeError(`Invalid ${definition}`);
  return JSON.stringify(value);
}

export { validateDeck } from "./deck.js";
