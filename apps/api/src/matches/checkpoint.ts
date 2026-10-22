import { Ajv } from "ajv";
import publicSchema from "../../../../packages/contracts/schema/api-v1.schema.json" with { type: "json" };
import { validateWire } from "@oathfront/contracts";
import {
  hashState,
  projectPlayerView,
  algorithmVersion,
} from "@oathfront/game-engine";
import type { MatchState } from "@oathfront/game-engine";
export const stateSchemaVersion = "match_state_v1";
const ref = (name: string) => ({ $ref: "#/definitions/" + name });
const integer = {
  type: "integer",
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
};
const object = (
  properties: Record<string, unknown>,
  optional: string[] = [],
) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: Object.keys(properties).filter((k) => !optional.includes(k)),
});
const array = (items: unknown) => ({ type: "array", items });
const nullable = (value: unknown) => ({ anyOf: [value, { type: "null" }] });
const side = { enum: ["GOOD", "EVIL"] };
const randomState = {
  type: "array",
  minItems: 4,
  maxItems: 4,
  items: { type: "integer", minimum: 0, maximum: 0xffffffff },
  not: { const: [0, 0, 0, 0] },
};
const {
  handCount: _h,
  deckCount: _d,
  reserveCount: _r,
  ...heroProperties
} = publicSchema.definitions.HeroView.properties;
void _h;
void _d;
void _r;
const player = object({
  ...heroProperties,
  hand: array(ref("HandCard")),
  deck: array(ref("HandCard")),
  reserve: array(ref("ReservePower")),
  receivedPowerIds: array(ref("PowerId")),
  mulliganCommitted: { type: "boolean" },
});
const unit = object({
  ...publicSchema.definitions.UnitView.properties,
  creationSeq: integer,
});
const laneId = { type: "integer", minimum: 1, maximum: 5 };
const job = object({
  source: unit,
  abilityId: { type: "string", minLength: 1 },
});
const continuation = object(
  {
    laneId,
    stage: { enum: ["BEFORE_PAIR", "PAIR", "BLOCK_RESPONSES", "AFTER_LANE"] },
    pendingResponders: array(
      object({ side, powerInstanceId: ref("InstanceId") }),
    ),
    beforeCombatJobs: array(job),
  },
  ["beforeCombatJobs"],
);
const stateSchema = object(
  {
    matchId: ref("Uuid"),
    mode: { enum: ["SKIRMISH", "TUTORIAL", "DAILY_CHALLENGE"] },
    challenge: ref("ChallengeView"),
    humanSide: side,
    difficulty: { enum: ["EASY", "NORMAL"] },
    versions: ref("Versions"),
    deckSnapshots: object({ GOOD: ref("DeckInput"), EVIL: ref("DeckInput") }),
    lifecycle: ref("Lifecycle"),
    turn: { type: "integer", minimum: 0, maximum: 20 },
    phase: ref("Phase"),
    activeSide: nullable(side),
    players: object({ GOOD: player, EVIL: player }),
    board: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: object({
        laneId,
        location: {
          anyOf: [
            object({ state: { const: "NORMAL" } }),
            object({
              state: { enum: ["HIDDEN", "ACTIVE"] },
              definitionId: ref("LocationId"),
              revealTurn: { enum: [1, 3, 5] },
            }),
          ],
        },
        good: nullable(unit),
        evil: nullable(unit),
      }),
    },
    random: object({
      algorithmVersion: { const: algorithmVersion },
      identityKey: { type: "string", pattern: "^[a-f0-9]{64}$" },
      states: object(
        Object.fromEntries(
          [
            "location",
            "deck:evil",
            "deck:good",
            "power:evil",
            "power:good",
            "bot:easy",
          ].map((k) => [k, randomState]),
        ),
      ),
    }),
    instanceSeq: integer,
    creationSeq: integer,
    eventSeq: integer,
    rootSeq: integer,
    turnCounters: { type: "object", additionalProperties: integer },
    continuation: nullable(continuation),
    blockResponse: nullable(
      object({ side, laneId, powerInstanceId: ref("InstanceId") }),
    ),
    endTurn: object({
      stage: { enum: ["HOOKS", "LOCATIONS", "EXPIRY"] },
      jobs: array(job),
      locationIndex: { type: "integer", minimum: 0, maximum: 5 },
    }),
    tutorial: object({
      ...publicSchema.definitions.TutorialView.properties,
      manifestVersion: { const: "tutorial_v1" },
      sceneLoadOrdinal: integer,
      scriptCursor: integer,
      branch: { enum: ["USED", "KEPT", null] },
      pendingScene: nullable(ref("ChapterId")),
    }),
    outcome: nullable(ref("Outcome")),
  },
  ["endTurn", "tutorial", "challenge"],
);
const ajv = new Ajv({
  strict: true,
  allErrors: false,
  validateFormats: false,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
});
const validator = ajv.compile<MatchState>({
  ...stateSchema,
  definitions: publicSchema.definitions,
});
export class PersistenceError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "PersistenceError";
  }
}
export function validateState(value: unknown): MatchState {
  if (!validator(value)) throw new PersistenceError("INVALID_CHECKPOINT");
  if (!validateWire("Uuid", value.matchId))
    throw new PersistenceError("INVALID_CHECKPOINT");
  try {
    projectPlayerView(value, value.humanSide);
  } catch {
    throw new PersistenceError("INVALID_CHECKPOINT");
  }
  return value;
}
export function encodeCheckpoint(state: MatchState) {
  validateState(state);
  const envelope = { stateSchemaVersion, state };
  if (Buffer.byteLength(JSON.stringify(envelope)) > 262144)
    throw new PersistenceError("CHECKPOINT_TOO_LARGE");
  return envelope;
}
export function decodeCheckpoint(
  value: unknown,
  expectedHash: string,
): MatchState {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("stateSchemaVersion" in value) ||
    value.stateSchemaVersion !== stateSchemaVersion ||
    !("state" in value) ||
    Object.keys(value).length !== 2
  )
    throw new PersistenceError("INVALID_CHECKPOINT");
  const state = validateState(value.state);
  if (hashState(state) !== expectedHash)
    throw new PersistenceError("INVALID_CHECKPOINT");
  return state;
}
