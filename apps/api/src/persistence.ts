// Backend-only distribution entrypoint. T07 adds HTTP registration separately.
export {
  createRepository,
  persistTransition,
  lockPrincipals,
} from "./matches/repository.js";
export type {
  MatchRecord,
  MatchTransaction,
  Receipt,
} from "./matches/repository.js";
export { recordIntent, recordAutomatic } from "./matches/journal.js";
export { PersistenceError, stateSchemaVersion } from "./matches/checkpoint.js";
export { createPool, migrateDatabase, grantRuntimeAccess } from "@oathfront/db";
export { projectPlayerView, hashState } from "@oathfront/game-engine";

export { insertInitialization } from "./matches/initialization.js";
export type { InitializationMetadata } from "./matches/initialization.js";
export { insertMatchReceipt } from "./matches/receipts.js";
