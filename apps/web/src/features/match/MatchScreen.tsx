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
        <h1>Không tải được trận</h1>
        <p>Trận có thể đã hết hạn hoặc kết nối đang gián đoạn.</p>
        <button onClick={retry}>Thử lại tải trận</button>
      </section>
    );
  if (!initial)
    return (
      <p className="loading" role="status">
        Đang tải bàn chơi…
      </p>
    );
  return (
    <MatchRuntime key={matchId} initial={initial} api={api} catalog={catalog} />
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
    recover,
  } = useMatchStore(initial, api);
  const authoritativeView = snapshot.authoritativeView;
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
      controller={controller}
      disabled={disabled}
      online={online}
      onCancel={cancel}
      recovering={recovering}
      onRecover={recover}
    >
      <div className="gameplay" data-battle-root>
        <BattleScene
          store={store}
          catalog={catalog}
          presentation={presentation}
          onView={setPresentationView}
        />
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
        >
          <BattleLog snapshot={snapshot} />
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
            <h2>Đổi bài đầu trận</h2>
            <p>
              Chọn tối đa bốn lá để đổi, hoặc giữ nguyên tay bài.{" "}
              {mulligan.length} lá sẽ đổi.
            </p>
          </section>
        )}
        <div className="hand-layout">
          <div className="reserve panel">
            <h2>Siêu năng lực</h2>
            {view.self.reserve.length ? (
              view.self.reserve.map((power) =>
                view.blockResponse?.visibility === "OWN" &&
                power.instanceId !== view.blockResponse.powerInstanceId ? (
                  <details key={power.instanceId}>
                    <summary>
                      {
                        catalog.powers.find(
                          (def) => def.id === power.definitionId,
                        )?.nameVi
                      }
                    </summary>
                    <p>
                      {
                        catalog.powers.find(
                          (def) => def.id === power.definitionId,
                        )?.exactTextVi
                      }
                    </p>
                    <p>
                      Chỉ xem trong lúc chờ phản hồi · 1 năng lượng khi đúng
                      pha.
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
                    {
                      catalog.powers.find(
                        (def) => def.id === power.definitionId,
                      )?.nameVi
                    }
                    <span>
                      {view.blockResponse?.visibility === "OWN" &&
                      view.blockResponse.powerInstanceId === power.instanceId
                        ? "Power đang chờ lựa chọn"
                        : "1 năng lượng"}
                    </span>
                  </button>
                ),
              )
            ) : (
              <p className="muted">Chưa có power để dùng.</p>
            )}
          </div>
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
                Xác nhận đổi bài
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
        <BattleLog snapshot={snapshot} compact />
        <p className="art-note">
          Hình khối minh họa tạm · Chỉ số và hiệu ứng là văn bản thật.
        </p>
      </div>
      {view.lifecycle === "PAUSED" && (
        <PauseDialog controller={controller} disabled={disabled} />
      )}
      {["COMPLETED", "ABANDONED", "FAULTED"].includes(view.lifecycle) && (
        <ResultDetail matchId={view.matchId} api={api} catalog={catalog} />
      )}
    </MatchShell>
  );
}
