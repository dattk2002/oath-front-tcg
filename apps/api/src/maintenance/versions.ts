import { coreCatalog } from "@oathfront/game-content";
import type { Pool } from "@oathfront/db";
import { tutorialManifestHash } from "../matches/tutorial.js";
export interface VersionRegistry {
  rules: readonly string[];
  content: readonly string[];
  locations: readonly string[];
  bot: readonly string[];
  tutorials: readonly {
    scenarioId: string;
    manifestHash: string;
    manifestVersion: string;
  }[];
}
export interface ActiveVersion {
  id: string;
  status: string;
  rules: string;
  content: string;
  locations: string;
  bot: string;
  scenarioId: string | null;
  manifestHash: string | null;
  manifestVersion: string | null;
}
export interface VersionSupportReport {
  canRelease: boolean;
  unsupported: { matchId: string; components: string[] }[];
}
export const supportedRegistry: VersionRegistry = {
  rules: [coreCatalog.rulesVersion],
  content: [coreCatalog.version],
  locations: [coreCatalog.locationVersion],
  bot: ["bot_v1"],
  tutorials: ["tutorial_v1", "tutorial_evil_v1"].map((scenarioId) => ({
    scenarioId,
    manifestHash: tutorialManifestHash(),
    manifestVersion: "tutorial_v1",
  })),
};
export function checkSupportedVersions(
  registry: VersionRegistry,
  activeMatches: readonly ActiveVersion[],
): VersionSupportReport {
  const unsupported: VersionSupportReport["unsupported"] = [];
  for (const m of activeMatches) {
    if (!["ACTIVE", "PAUSED"].includes(m.status)) continue;
    const components: string[] = [];
    for (const key of ["rules", "content", "locations", "bot"] as const)
      if (!registry[key].includes(m[key])) components.push(key);
    if (
      (m.scenarioId !== null ||
        m.manifestHash !== null ||
        m.manifestVersion !== null) &&
      !registry.tutorials.some(
        (t) =>
          t.scenarioId === m.scenarioId &&
          t.manifestHash === m.manifestHash &&
          t.manifestVersion === m.manifestVersion,
      )
    )
      components.push("tutorial");
    if (components.length) unsupported.push({ matchId: m.id, components });
  }
  return { canRelease: unsupported.length === 0, unsupported };
}
export async function inspectSupportedVersions(
  db: Pool,
  registry = supportedRegistry,
) {
  const { rows } = await db.query<ActiveVersion>(
    `SELECT m.id,m.status,m.rules_version AS rules,m.content_version AS content,m.location_version AS locations,m.bot_version AS bot,m.scenario_id AS "scenarioId",m.tutorial_manifest_sha256 AS "manifestHash",c.state->'state'->'tutorial'->>'manifestVersion' AS "manifestVersion" FROM matches m LEFT JOIN match_checkpoints c ON c.match_id=m.id WHERE m.status IN ('ACTIVE','PAUSED')`,
  );
  return checkSupportedVersions(registry, rows);
}
