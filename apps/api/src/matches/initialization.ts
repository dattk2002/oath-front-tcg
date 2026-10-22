import { createChallengeMatch } from "@oathfront/game-engine/challenges";
import { loadScenario } from "../events/scenarios.js";
import { verifyTutorialBinding } from "./tutorial.js";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  createMatchWithEvents,
  createRandomStreams,
  hashState,
  canonicalJson,
  algorithmVersion,
} from "@oathfront/game-engine";
import type { MatchConfig } from "@oathfront/game-engine";
import { supportedCatalogs } from "@oathfront/game-content";
import { validateWire } from "@oathfront/contracts";
import type { RematchConfig } from "@oathfront/contracts";
import type { Pool, PoolClient } from "@oathfront/db";
import { encodeCheckpoint, PersistenceError } from "./checkpoint.js";
import { appendEvents } from "./journal.js";
export interface InitializationMetadata {
  expiresAt: Date;
  rematch: RematchConfig | null;
  scenarioId?: string;
  tutorialManifestSha256?: string;
  scenarioManifestSha256?: string;
}
export const hashJson = (value: unknown) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
export async function registerRelease(pool: Pool | PoolClient) {
  for (const catalog of supportedCatalogs) {
    const digest = hashJson(catalog);
    await pool.query(
      "INSERT INTO content_releases(version,rules_version,location_version,manifest,sha256) VALUES($1,$2,$3,$4,$5) ON CONFLICT(version) DO NOTHING",
      [
        catalog.version,
        catalog.rulesVersion,
        catalog.locationVersion,
        JSON.stringify(catalog),
        digest,
      ],
    );
    const r = await pool.query(
      "SELECT sha256,manifest FROM content_releases WHERE version=$1",
      [catalog.version],
    );
    if (
      r.rows[0]?.sha256 !== digest ||
      !isDeepStrictEqual(r.rows[0]?.manifest, catalog)
    )
      throw new PersistenceError("CONTENT_CHECKSUM_MISMATCH");
  }
}
/** Caller holds the principal lock before any match row/FK work. */
export async function insertInitialization(
  tx: PoolClient,
  principalId: string,
  config: MatchConfig,
  seed: Uint8Array,
  metadata: InitializationMetadata,
  time: Date,
) {
  if (
    config.mode === "SKIRMISH"
      ? !validateWire("RematchConfig", metadata.rematch)
      : metadata.rematch !== null
  )
    throw new PersistenceError("INVALID_REMATCH");
  if (config.mode === "TUTORIAL")
    verifyTutorialBinding(
      metadata.scenarioId,
      metadata.tutorialManifestSha256,
      "tutorial_v1",
      config.humanSide,
    );
  const scenario =
    config.mode === "DAILY_CHALLENGE" && metadata.scenarioId
      ? await loadScenario(tx, metadata.scenarioId)
      : null;
  if (
    config.mode === "DAILY_CHALLENGE" &&
    (!scenario ||
      scenario.sha256 !== metadata.scenarioManifestSha256 ||
      Buffer.from(seed).toString("hex") !== scenario.manifest.seedHex ||
      !isDeepStrictEqual(config.decks, scenario.manifest.decks) ||
      config.humanSide !== scenario.manifest.humanSide)
  )
    throw new PersistenceError("INVALID_INITIALIZATION");
  const transition = scenario
      ? createChallengeMatch(config.matchId, scenario)
      : createMatchWithEvents(config, createRandomStreams(seed)),
    state = transition.nextState;
  const envelope = encodeCheckpoint(state);
  const p = await tx.query(
    "SELECT merged_into_principal_id FROM principals WHERE id=$1",
    [principalId],
  );
  if (p.rows[0].merged_into_principal_id)
    throw new PersistenceError("PRINCIPAL_MERGED");
  await tx.query(
    "INSERT INTO matches(id,human_principal_id,human_side,mode,status,revision,rules_version,content_version,location_version,bot_version,scenario_id,tutorial_manifest_sha256,rematch,created_at,updated_at,last_activity_at,expires_at,scenario_manifest_sha256) VALUES($1,$2,$3,$4,$5,0,$6,$7,$8,$9,$10,$11,$12,$13,$13,$13,$14,$15)",
    [
      config.matchId,
      principalId,
      config.humanSide,
      config.mode,
      state.lifecycle,
      config.versions.rules,
      config.versions.content,
      config.versions.locations,
      config.versions.bot,
      metadata.scenarioId ?? null,
      metadata.tutorialManifestSha256 ?? null,
      JSON.stringify(metadata.rematch),
      time,
      metadata.expiresAt,
      metadata.scenarioManifestSha256 ?? null,
    ],
  );
  await tx.query(
    "INSERT INTO match_initializations(match_id,heroes,deck_snapshots,initial_state,private_seed,rng_algorithm_version) VALUES($1,$2,$3,$4,$5,$6)",
    [
      config.matchId,
      JSON.stringify({
        GOOD: state.players.GOOD.heroId,
        EVIL: state.players.EVIL.heroId,
      }),
      JSON.stringify(state.deckSnapshots),
      JSON.stringify(envelope),
      Buffer.from(seed),
      algorithmVersion,
    ],
  );
  await tx.query(
    "INSERT INTO match_checkpoints(match_id,revision,state,state_hash,last_event_seq,updated_at) VALUES($1,0,$2,$3,$4,$5)",
    [
      config.matchId,
      JSON.stringify(envelope),
      hashState(state),
      state.eventSeq,
      time,
    ],
  );
  await appendEvents(tx, config.matchId, transition.events);
  return transition;
}
