import { Ajv, type ValidateFunction } from "ajv";
import { fullFormats } from "ajv-formats/dist/formats.js";
import schema from "../schema/api-v1.schema.json" with { type: "json" };
import type { WireDefinitions } from "./generated/api-v1.js";
const ajv = new Ajv({
  allErrors: true,
  strict: true,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
});
for (const [name, format] of Object.entries(fullFormats))
  ajv.addFormat(name, format);
const validators = new Map<string, ValidateFunction>();
export function wireValidator<K extends keyof WireDefinitions>(
  definition: K,
): ValidateFunction<WireDefinitions[K]>;
export function wireValidator(definition: string): ValidateFunction;
export function wireValidator(definition: string): ValidateFunction {
  if (!Object.hasOwn(schema.definitions, definition))
    throw new Error(`Unknown public definition: ${definition}`);
  let validator = validators.get(definition);
  if (!validator) {
    validator = ajv.compile({ ...schema, $ref: `#/definitions/${definition}` });
    validators.set(definition, validator);
  }
  return validator;
}
export function validateWire<K extends keyof WireDefinitions>(
  definition: K,
  value: unknown,
): value is WireDefinitions[K];
export function validateWire(definition: string, value: unknown): boolean;
export function validateWire(definition: string, value: unknown): boolean {
  return wireValidator(definition)(value);
}
/** Validate before serialization so private/unknown fields never cross the HTTP boundary. */
export function serializeWire(definition: string, value: unknown): string {
  const validator = wireValidator(definition);
  if (!validator(value))
    throw new TypeError(
      `Invalid ${definition}: ${ajv.errorsText(validator.errors)}`,
    );
  return JSON.stringify(value);
}
