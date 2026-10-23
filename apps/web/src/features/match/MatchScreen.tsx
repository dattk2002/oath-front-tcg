import { useVersionedCatalog } from "../content/use-versioned-catalog";
import { contentName, contentText } from "../../content/english-content";
import TutorialOverlay from "../tutorial/TutorialOverlay";
import ArtImage from "./ArtImage";
import { useSettings } from "../settings/SettingsDialog";
import { useEffect } from "react";
import { useState } from "react";
import type {
  CommandResponse,
  PlayerAction,
  PublicCatalog,
  PlayerView,
  Target,
  UnitView,
} from "@oathfront/contracts";
import type { ApiClient } from "./api-client";
import {
  actionEqual,
  sourceActions,
  targetEqual,
  targetFor,
} from "./intent-controller";
import HeroPanel from "./HeroPanel";
import Board from "./Board";
import Hand from "./Hand";
import PhaseControl from "./PhaseControl";
import InspectPanel from "./InspectPanel";
import BlockResponse from "./BlockResponse";
import BattleLog from "./BattleLog";
import PauseDialog from "./PauseDialog";
import { ResultDetail } from "./ResultDialog";
import { useLoadedMatch, useMatchStore } from "./use-match";
import MatchShell from "./MatchShell";
import BattleScene from "./BattleScene";
export default function MatchScreen({
  api,
  catalog,
  matchId,
}: {
  api: ApiClient;
  catalog: PublicCatalog;
  matchId: string;
}) {
  const { initial, failed, expired, retry } = useLoadedMatch(api, matchId);
  const bound = useVersionedCatalog(
    api,
    initial?.view.versions.content,
    catalog,
  );
  if (expired)
    return (
      <ResultDetail
        key={matchId}
        matchId={matchId}
        api={api}
        catalog={catalog}
      />
    );
  if (failed)
    return (
      <section className="status-panel panel">
        <h1>Match unavailable</h1>
        <p>The match may have expired or the connection may be interrupted.</p>
        <button onClick={retry}>Retry match</button>
      </section>
    );
  if (bound.failed)
    return (
      <section className="status-panel panel">
        <h1>Match rules unavailable</h1>
        <p>The original match catalog could not be loaded.</p>
        <button onClick={bound.retry}>Retry match rules</button>
      </section>
    );
  if (!initial || !bound.catalog)
    return (
      <p className="loading" role="status">
        Loading battlefield…
      </p>
    );
  return (
    <MatchRuntime
      key={matchId}
      initial={initial}
      api={api}
      catalog={bound.catalog}
    />
  );
}
function MatchRuntime({
  initial,
  api,
  catalog,
}: {
  initial: CommandResponse;
  api: ApiClient;
  catalog: PublicCatalog;
}) {
  const {
    store,
    snapshot,
    controller,
    disabled,
    online,
    presentation,
    recovering,
    recoveryMessage,
    recover,
  } = useMatchStore(initial, api);
  const authoritativeView = snapshot.authoritativeView;
  const { audio } = useSettings();
  useEffect(() => {
    audio?.setPaused(authoritativeView.lifecycle === "PAUSED");
    return () => audio?.setPaused(false);
  }, [audio, authoritativeView.lifecycle]);
  const [presentationView, setPresentationView] =
    useState<PlayerView>(authoritativeView);
  const view = {
    ...authoritativeView,
    board: presentationView.board,
    players: {
      GOOD: {
        ...authoritativeView.players.GOOD,
        hp: presentationView.players.GOOD.hp,
      },
      EVIL: {
        ...authoritativeView.players.EVIL,
        hp: presentationView.players.EVIL.hp,
      },
    },
  };
  const [mulligan, setMulligan] = useState<string[]>([]),
    [inspected, setInspected] = useState<UnitView | null>(null),
    [forecast, setForecast] = useState<PlayerAction | null>(null);
  const actions = snapshot.selection
    ? sourceActions(store, snapshot.selection.instanceId)
    : [];
  const noTarget = actions.find((action) => {
    const target = targetFor(action);
    return target?.kind === "NONE";
  });
  const preview =
    forecast && actions.some((action) => actionEqual(action, forecast))
      ? forecast
      : (noTarget ?? null);
  const enemy = view.self.side === "GOOD" ? "EVIL" : "GOOD";
  const isMulligan = view.phase === "MULLIGAN" && !view.self.mulliganCommitted;
  function target(target: Target) {
    if (!disabled) void controller.selectTarget(target);
  }
  function cancel() {
    controller.cancelSelection();
    setInspected(null);
    setForecast(null);
  }
  return (
    <MatchShell
      snapshot={snapshot}
      catalog={catalog}
      controller={controller}
      disabled={disabled}
      online={online}
      onCancel={cancel}
      recovering={recovering}
      recoveryMessage={recoveryMessage}
      onRecover={recover}
    >
      <div className="gameplay arena-stage" data-battle-root>
        <HeroPanel
          hero={view.players[enemy]}
          side={enemy}
          own={false}
          catalog={catalog}
          targetable={
            !disabled &&
            actions.some((action) =>
              targetEqual(targetFor(action), { kind: "HERO", side: enemy }),
            )
          }
          onTarget={() => target({ kind: "HERO", side: enemy })}
          onPreview={() =>
            setForecast(
              actions.find((action) =>
                targetEqual(targetFor(action), { kind: "HERO", side: enemy }),
              ) ?? null,
            )
          }
        />
        <div
          className={`battle-layout ${view.blockResponse?.visibility === "OWN" ? "responding" : ""}`}
          data-block-targeting={
            view.blockResponse?.visibility === "OWN" &&
            snapshot.selection?.instanceId ===
              view.blockResponse.powerInstanceId
          }
        >
          <div className="battle-center">
            <Board
              view={view}
              catalog={catalog}
              actions={actions}
              selectedUnit={snapshot.selection?.unitInstanceId ?? null}
              disabled={disabled}
              onTarget={target}
              onInspect={(unit) => {
                controller.cancelSelection();
                setInspected(unit);
              }}
              onPreview={setForecast}
            />
            <HeroPanel
              hero={view.players[view.self.side]}
              side={view.self.side}
              own
              tutorialEnergyFocus={
                !!view.tutorial?.focusTargets.some((t) => t.kind === "ENERGY")
              }
              catalog={catalog}
              targetable={
                !disabled &&
                actions.some((action) =>
                  targetEqual(targetFor(action), {
                    kind: "HERO",
                    side: view.self.side,
                  }),
                )
              }
              onTarget={() => target({ kind: "HERO", side: view.self.side })}
              onPreview={() =>
                setForecast(
                  actions.find((action) =>
                    targetEqual(targetFor(action), {
                      kind: "HERO",
                      side: view.self.side,
                    }),
                  ) ?? null,
                )
              }
            />
          </div>
          {view.blockResponse?.visibility === "OWN" ? (
            <BlockResponse
              view={authoritativeView}
              catalog={catalog}
              controller={controller}
              selectedId={snapshot.selection?.instanceId ?? null}
              disabled={disabled}
              online={online}
            />
          ) : (
            <InspectPanel
              view={view}
              catalog={catalog}
              selectedId={snapshot.selection?.instanceId ?? null}
              unit={
                snapshot.selection
                  ? null
                  : inspected
                    ? (view.board
                        .flatMap((lane) => [lane.good, lane.evil])
                        .find(
                          (unit) => unit?.instanceId === inspected.instanceId,
                        ) ?? null)
                    : null
              }
              action={preview}
              onCancel={cancel}
              onConfirm={(action) => {
                if (!disabled) void controller.submitIntent(action);
              }}
            />
          )}
        </div>
        {isMulligan && (
          <section className="mulligan-heading">
            <h2>Opening mulligan</h2>
            <p>
              Choose up to four cards to replace, or keep your hand.{" "}
              {mulligan.length} cards to replace.
            </p>
          </section>
        )}
        <div className="hand-layout">
          <details className="reserve panel">
            <summary>Powers · {view.self.reserve.length}</summary>
            {view.self.reserve.length ? (
              view.self.reserve.map((power) =>
                view.blockResponse?.visibility === "OWN" &&
                power.instanceId !== view.blockResponse.powerInstanceId ? (
                  <details key={power.instanceId}>
                    <summary>
                      {contentName(
                        catalog.powers.find(
                          (def) => def.id === power.definitionId,
                        )?.id ?? "",
                      )}
                    </summary>
                    <p>
                      {contentText(
                        catalog.powers.find(
                          (def) => def.id === power.definitionId,
                        )?.id ?? "",
                      )}
                    </p>
                    <p>
                      Inspect only while awaiting a response · 1 energy in the
                      correct phase.
                    </p>
                  </details>
                ) : (
                  <button
                    disabled={
                      disabled || view.blockResponse?.visibility === "OWN"
                    }
                    key={power.instanceId}
                    aria-pressed={
                      snapshot.selection?.instanceId === power.instanceId
                    }
                    onClick={() => {
                      setInspected(null);
                      controller.selectCard(power.instanceId);
                    }}
                  >
                    <span className="reserve-art">
                      <ArtImage
                        artKey={
                          catalog.powers.find(
                            (def) => def.id === power.definitionId,
                          )!.artKey
                        }
                        name={contentName(
                          catalog.powers.find(
                            (def) => def.id === power.definitionId,
                          )!.id,
                        )}
                        retry={false}
                      />
                    </span>
                    {contentName(
                      catalog.powers.find(
                        (def) => def.id === power.definitionId,
                      )?.id ?? "",
                    )}
                    <span>
                      {view.blockResponse?.visibility === "OWN" &&
                      view.blockResponse.powerInstanceId === power.instanceId
                        ? "Power awaiting a choice"
                        : "1 energy"}
                    </span>
                  </button>
                ),
              )
            ) : (
              <p className="muted">No powers available yet.</p>
            )}
          </details>
          <Hand
            view={view}
            catalog={catalog}
            controller={controller}
            selectedId={snapshot.selection?.instanceId ?? null}
            disabled={disabled}
            mulligan={isMulligan ? mulligan : null}
            onMulligan={(id) => {
              if (!disabled)
                setMulligan((current) =>
                  current.includes(id)
                    ? current.filter((item) => item !== id)
                    : [...current, id],
                );
            }}
          />
          {isMulligan ? (
            <div className="phase-controls">
              <button
                className="primary"
                disabled={disabled}
                onClick={() =>
                  void controller.submitIntent({
                    kind: "MULLIGAN",
                    cardInstanceIds: mulligan,
                  })
                }
              >
                Confirm mulligan
              </button>
            </div>
          ) : view.blockResponse?.visibility === "OWN" ? null : (
            <PhaseControl
              snapshot={snapshot}
              controller={controller}
              disabled={disabled}
            />
          )}
        </div>
        <TutorialOverlay
          view={authoritativeView}
          disabled={disabled}
          onAction={(action) => void controller.submitIntent(action)}
        />
        <BattleLog snapshot={snapshot} compact />
        <BattleScene
          store={store}
          catalog={catalog}
          presentation={presentation}
          onView={setPresentationView}
        />
      </div>
      {view.lifecycle === "PAUSED" && (
        <PauseDialog
          controller={controller}
          disabled={disabled}
          snapshot={snapshot}
          online={online}
          recovering={recovering}
          recoveryMessage={recoveryMessage}
          onRecover={recover}
        />
      )}
      {["COMPLETED", "ABANDONED", "FAULTED"].includes(view.lifecycle) && (
        <ResultDetail matchId={view.matchId} api={api} catalog={catalog} />
      )}
    </MatchShell>
  );
}
