import { createTutorialConfig, tutorialManifestHash } from "./tutorial.js";
import { randomBytes, randomUUID } from "node:crypto";
import { coreCatalog, validateDeck } from "@oathfront/game-content";
import { validateWire } from "@oathfront/contracts";
import type {
  CommandEnvelope,
  CommandResponse,
  CreateMatchRequest,
  DeckInput,
  RematchConfig,
} from "@oathfront/contracts";
import type { Pool, PoolClient } from "@oathfront/db";
import type { MatchConfig } from "@oathfront/game-engine";
import { revalidateSession } from "../auth/sessions.js";
import type { SessionPrincipal } from "../auth/sessions.js";
import { HttpError, output } from "../http.js";
import { createRepository, persistTransition } from "./repository.js";
import { insertInitialization, hashJson } from "./initialization.js";
import { insertMatchReceipt } from "./receipts.js";
import { commandResponse, eventReader } from "./events.js";
import { commandTransition } from "./commands.js";
import { botScheduler } from "./advance.js";
import type { Scheduler } from "./commands.js";
import { summaryReader } from "./summary.js";
export function matchService(
  pool: Pool,
  options: {
    now?: () => Date;
    scheduler?: Scheduler;
    cpuClock?: () => number;
  } = {},
) {
  const now = options.now ?? (() => new Date()),
    scheduler = options.scheduler ?? botScheduler,
    repository = createRepository(pool, { now });
  const expiry = (p: SessionPrincipal) =>
    p.kind === "GUEST"
      ? p.expiresAt!
      : new Date(now().getTime() + 30 * 86400000);
  async function receipt(
    tx: PoolClient,
    p: SessionPrincipal,
    id: string,
    hash: string,
  ) {
    const found = await repository.findReceipt(p.id, id, tx);
    if (!found) return null;
    if (found.requestHash !== hash)
      throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
    return output("CommandResponse", found.response);
  }
  async function createMatch(
    principal: SessionPrincipal,
    request: CreateMatchRequest,
  ): Promise<CommandResponse> {
    return repository.withPrincipalTransaction([principal.id], async (tx) => {
      await revalidateSession(tx, principal, now());
      const hash = hashJson({ route: "create", request }),
        previous = await receipt(tx, principal, request.commandId, hash);
      if (previous) return previous;
      if (
        request.mode === "SKIRMISH" &&
        request.expectedContentVersion !== coreCatalog.version
      )
        throw new HttpError(409, "VERSION_UNSUPPORTED");
      const active = (
        await tx.query(
          "SELECT id FROM matches WHERE human_principal_id=$1 AND status IN ('ACTIVE','PAUSED') FOR UPDATE",
          [principal.id],
        )
      ).rows[0];
      if (active)
        throw new HttpError(409, "ACTIVE_MATCH_EXISTS", { matchId: active.id });
      if (request.mode === "TUTORIAL") {
        const config = createTutorialConfig(
          request.scenarioId === "tutorial_v1" ? "GOOD" : "EVIL",
        );
        const result = await insertInitialization(
          tx,
          principal.id,
          config,
          randomBytes(32),
          {
            expiresAt: expiry(principal),
            rematch: null,
            scenarioId: request.scenarioId,
            tutorialManifestSha256: tutorialManifestHash(),
          },
          now(),
        );
        const response = commandResponse(
          result.nextState,
          0,
          result.events,
          0,
          0,
          scheduler,
        );
        await insertMatchReceipt(tx, {
          principalId: principal.id,
          state: result.nextState,
          revision: 0,
          receipt: {
            commandId: request.commandId,
            requestHash: hash,
            response,
            expiresAt: expiry(principal),
          },
          now: now(),
        });
        return response;
      }
      let deck: DeckInput;
      if (request.deck.kind === "PRESET") {
        const p = coreCatalog.presets.find(
          (p) =>
            p.presetId ===
            (request.deck.kind === "PRESET" ? request.deck.presetId : ""),
        );
        if (!p) throw new HttpError(404, "NOT_FOUND");
        deck = {
          name: p.name,
          heroId: p.heroId,
          entries: p.entries,
          contentVersion: p.contentVersion,
        };
      } else {
        const version = (
          await tx.query(
            "SELECT v.* FROM deck_versions v JOIN decks d ON d.id=v.deck_id WHERE v.deck_id=$1 AND v.revision=$2 AND d.owner_id=$3",
            [request.deck.deckId, request.deck.deckRevision, principal.id],
          )
        ).rows[0];
        if (!version) throw new HttpError(404, "NOT_FOUND");
        deck = output("DeckInput", {
          name: "Đội hình",
          heroId: version.hero_id,
          entries: version.entries,
          contentVersion: version.content_version,
        });
      }
      const validation = validateDeck(deck, coreCatalog);
      if (!validation.playable)
        throw new HttpError(422, "INVALID_DECK", { validation });
      const human = coreCatalog.heroes.find((h) => h.id === deck.heroId)!,
        bot = coreCatalog.heroes.find((h) => h.id === request.opponentHeroId)!;
      if (human.faction === bot.faction)
        throw new HttpError(422, "ILLEGAL_ACTION", {
          reason: "INVALID_TARGET",
          field: null,
        });
      const preset = coreCatalog.presets.find((p) => p.heroId === bot.id)!;
      const botDeck: DeckInput = {
        name: preset.name,
        heroId: bot.id,
        entries: preset.entries,
        contentVersion: coreCatalog.version,
      };
      const config: MatchConfig = {
        matchId: randomUUID(),
        mode: "SKIRMISH",
        humanSide: human.faction,
        difficulty: request.difficulty,
        versions: {
          rules: coreCatalog.rulesVersion,
          content: coreCatalog.version,
          locations: coreCatalog.locationVersion,
          bot: "bot_v1",
        },
        decks:
          human.faction === "GOOD"
            ? { GOOD: deck, EVIL: botDeck }
            : { GOOD: botDeck, EVIL: deck },
      };
      const rematch: RematchConfig = {
        deck: request.deck,
        opponentHeroId: request.opponentHeroId,
        difficulty: request.difficulty,
        expectedContentVersion: request.expectedContentVersion,
      };
      const result = await insertInitialization(
        tx,
        principal.id,
        config,
        randomBytes(32),
        { expiresAt: expiry(principal), rematch },
        now(),
      );
      const response = commandResponse(
        result.nextState,
        0,
        result.events,
        0,
        0,
        scheduler,
      );
      await insertMatchReceipt(tx, {
        principalId: principal.id,
        state: result.nextState,
        revision: 0,
        receipt: {
          commandId: request.commandId,
          requestHash: hash,
          response,
          expiresAt: expiry(principal),
        },
        now: now(),
      });
      return response;
    });
  }
  async function readMatchView(principal: SessionPrincipal, matchId: string) {
    const record = await repository.loadMatch(principal.id, matchId);
    return commandResponse(
      record.state,
      record.revision,
      [],
      record.state.eventSeq,
      record.botIntentsThisTurn,
      scheduler,
    );
  }
  async function executeCommand(
    principal: SessionPrincipal,
    matchId: string,
    envelope: CommandEnvelope,
  ): Promise<CommandResponse> {
    return repository.withLockedMatch(
      principal.id,
      matchId,
      async (tx, record) => {
        await revalidateSession(tx.client, principal, now());
        const hash = hashJson({ route: "command", matchId, envelope }),
          previous = await receipt(
            tx.client,
            principal,
            envelope.commandId,
            hash,
          );
        if (previous) return previous;
        if (envelope.expectedRevision !== record.revision)
          throw new HttpError(409, "STALE_REVISION", {
            snapshot: commandResponse(
              record.state,
              record.revision,
              [],
              record.state.eventSeq,
              record.botIntentsThisTurn,
              scheduler,
            ),
          });
        const result = commandTransition(
          record.state,
          envelope.action,
          record.lastStepSeq,
          record.botIntentsThisTurn,
          scheduler,
          options.cpuClock,
        );
        const response = commandResponse(
          result.transition.nextState,
          record.revision + 1,
          result.transition.events,
          record.state.eventSeq,
          result.botIntentsThisTurn,
          scheduler,
        );
        await persistTransition(
          tx,
          result.transition,
          result.journal.length ? result.journal : [result.entry],
          {
            commandId: envelope.commandId,
            requestHash: hash,
            response,
            expiresAt: expiry(principal),
          },
          { now: now(), botIntentsThisTurn: result.botIntentsThisTurn },
        );
        if (
          result.transition.nextState.outcome?.reason === "TUTORIAL_COMPLETED"
        ) {
          const column =
            result.transition.nextState.humanSide === "GOOD"
              ? "tutorial_completed_at"
              : "evil_tutorial_completed_at";
          await tx.client.query(
            `UPDATE principals SET ${column}=COALESCE(${column},$2) WHERE id=$1`,
            [principal.id, now()],
          );
        }
        if (
          principal.kind === "ACCOUNT" &&
          ["ACTIVE", "PAUSED"].includes(result.transition.nextState.lifecycle)
        ) {
          const deadline = expiry(principal);
          await tx.client.query(
            "UPDATE matches SET expires_at=$2 WHERE id=$1",
            [matchId, deadline],
          );
          await tx.client.query(
            "UPDATE command_receipts SET expires_at=$3 WHERE principal_id=$1 AND resource_id=$2",
            [principal.id, matchId, deadline],
          );
        }
        return response;
      },
    );
  }
  return {
    repository,
    createMatch,
    readMatchView,
    executeCommand,
    readVisibleEvents: eventReader(pool, repository),
    ...summaryReader(pool, now),
  };
}
export function validMatchId(value: unknown) {
  if (!validateWire("Uuid", value))
    throw new HttpError(400, "VALIDATION_FAILED", {
      issues: [{ path: "/id", rule: "uuid" }],
    });
  return value;
}
