import { RarityBadge, SystemBadge } from "../content/ContentBadges";
import { contentName, contentText } from "../../content/english-content";
import type {
  PlayerAction,
  PlayerView,
  PublicCatalog,
  UnitView,
} from "@oathfront/contracts";
import { previewPublicAction } from "@oathfront/game-engine/preview";
import { keywordLabel, unitStatuses } from "./labels";
import ArtImage from "./ArtImage";
const unknownLabel = {
  DRAW: "Unknown card draw",
  POWER_GRANT: "Random power grant",
  HIDDEN_LOCATION: "Hidden location",
  TRIGGER_HISTORY: "Unknown trigger history",
  OPPONENT_RESPONSE: "Opponent response",
  MULLIGAN: "Unknown mulligan cards",
};
export default function InspectPanel({
  view,
  catalog,
  selectedId,
  unit,
  action,
  onCancel,
  onConfirm,
}: {
  view: PlayerView;
  catalog: PublicCatalog;
  selectedId: string | null;
  unit: UnitView | null;
  action: PlayerAction | null;
  onCancel: () => void;
  onConfirm: (action: PlayerAction) => void;
}) {
  const selected = [...view.self.hand, ...view.self.reserve].find(
    (item) => item.instanceId === selectedId,
  );
  const definitionId = selected?.definitionId ?? unit?.definitionId;
  const def = [...catalog.cards, ...catalog.powers, ...catalog.tokens].find(
    (item) => item.id === definitionId,
  );
  const preview = action ? previewPublicAction(view, action) : null;
  return (
    <aside className="inspect panel" aria-label="Selection details">
      <h2>
        {def ? contentName(def.id) : "Read the board, choose your moment"}
      </h2>
      {def ? (
        <>
          <p className="eyebrow">
            {"cost" in def
              ? `${def.cost} energy`
              : "normalCost" in (selected ?? {})
                ? "Power · 1 energy"
                : "Summoned unit"}
          </p>
          {"cost" in def && (
            <div className="card-affinities">
              <RarityBadge rarity={def.rarity} full />
              <SystemBadge system={def.classId} />
            </div>
          )}
          <div className="inspect-art">
            <ArtImage
              artKey={def.artKey}
              name={contentName(def.id)}
              variant="inspect"
            />
          </div>
          <p>
            {"exactTextVi" in def
              ? contentText(def.id)
              : "A unit summoned onto the board."}
          </p>
          {"keywords" in def && (
            <p>{def.keywords.map((key) => keywordLabel[key]).join(" · ")}</p>
          )}
          {unit && (
            <>
              <p>
                Printed stats: {unit.printed.attack} ATK / {unit.printed.hp} HP
              </p>
              <p>
                Current: {unit.current.attack} ATK / {unit.current.hp} HP
              </p>
              <p>{unitStatuses(unit).join(" · ")}</p>
              {unit.modifiers.length > 0 && (
                <details>
                  <summary>Sources of stat changes</summary>
                  <ul>
                    {unit.modifiers.map((modifier, index) => (
                      <li key={index}>
                        {modifier.attackDelta >= 0 ? "+" : ""}
                        {modifier.attackDelta} ATK /{" "}
                        {modifier.healthDelta >= 0 ? "+" : ""}
                        {modifier.healthDelta} HP ·{" "}
                        {modifier.duration === "TURN_END"
                          ? "Until turn end"
                          : "Permanent"}{" "}
                        · {modifier.sourceDefinitionId}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </>
      ) : (
        <p className="muted">
          Select a card to read its full effects. Select a unit on the board to
          read its stats and statuses.
        </p>
      )}
      {preview && preview.forecast !== "NONE" ? (
        <section className="forecast" aria-label="Public forecast">
          <h3>Forecast for the current board</h3>
          <p>
            {action?.kind === "PLAY_UNIT" ? `Lane ${action.laneId} · ` : ""}
            Costs {preview.energySpent} energy
          </p>
          <p>
            Enemy hero damage: {preview.enemyHeroDamage}
            <br />
            Your hero damage: {preview.ownHeroDamage}
          </p>
          {preview.uncertainty && (
            <p className="notice">
              Uncertain:{" "}
              {preview.unknowns.map((key) => unknownLabel[key]).join("; ")}.
            </p>
          )}
        </section>
      ) : (
        selected && (
          <p className="muted">
            Select or hover a legal target to see a forecast.
          </p>
        )
      )}
      {action && "target" in action && action.target.kind === "NONE" && (
        <button className="primary" onClick={() => onConfirm(action)}>
          Confirm card use
        </button>
      )}
      {(selected || unit) && (
        <button onClick={onCancel}>Cancel selection · Esc</button>
      )}
    </aside>
  );
}
