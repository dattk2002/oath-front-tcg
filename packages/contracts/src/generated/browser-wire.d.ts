/* Generated from docs/contracts/api-v1.schema.json. Run pnpm contracts:generate. */
import type { WireDefinitions } from './api-v1.js';
declare const validators: { [K in keyof WireDefinitions]: (value: unknown) => boolean };
export default validators;
