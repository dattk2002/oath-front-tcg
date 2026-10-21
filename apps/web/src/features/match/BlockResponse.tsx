import { contentName, contentText } from "../../content/english-content";
import { useEffect, useRef } from "react";
import type { PlayerView, PublicCatalog } from "@oathfront/contracts";
import type { IntentController } from "./intent-controller";
import ArtImage from "./ArtImage";
export default function BlockResponse({
  view,
  catalog,
  controller,
  selectedId,
  disabled,
  online,
}: {
  view: PlayerView;
  catalog: PublicCatalog;
  controller: IntentController;
  selectedId: string | null;
  disabled: boolean;
  online: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null),
    useButton = useRef<HTMLButtonElement>(null);
  const response = view.blockResponse;
  const powerId =
    response?.visibility === "OWN" ? response.powerInstanceId : null;
  const targeting = !!powerId && selectedId === powerId;
  const wasTargeting = useRef(false);
  useEffect(() => {
    heading.current?.focus();
  }, [powerId]);
  useEffect(() => {
    if (targeting)
      document
        .querySelector<HTMLElement>('[data-legal-target="true"]')
        ?.focus();
    else if (wasTargeting.current) useButton.current?.focus();
    wasTargeting.current = targeting;
  }, [targeting]);
  if (response?.visibility !== "OWN") return null;
  const card = view.self.reserve.find((card) => card.instanceId === powerId);
  const power = catalog.powers.find((power) => power.id === card?.definitionId);
  const actions = view.legalActions.filter(
    (action) =>
      action.kind === "USE_BLOCK_POWER" && action.powerInstanceId === powerId,
  );
  const keep = view.legalActions.find(
    (action) => action.kind === "KEEP_BLOCK_POWER",
  );
  return (
    <section className="block-response panel" aria-label="Block response">
      <h2 ref={heading} tabIndex={-1}>
        Attack blocked
      </h2>
      <p>
        Block 0 / 8 · {3 - view.players[view.self.side].block.used} blocks
        remaining
      </p>
      <h3>{contentName(power?.id ?? "")}</h3>
      {power && (
        <div className="block-power-art">
          <ArtImage artKey={power.artKey} name={contentName(power.id)} />
        </div>
      )}
      {power?.signatureOwner && <p>Signature power</p>}
      <p className="free-power">Free right now</p>
      <p>{contentText(power?.id ?? "")}</p>
      {!online && <p role="status">Reconnecting</p>}
      {targeting ? (
        <>
          <h3>Choose a target</h3>
          <p>Choose a highlighted area. Esc cancels targeting.</p>
          <button onClick={() => controller.cancelSelection()}>
            Cancel target
          </button>
        </>
      ) : (
        <>
          {!actions.length && <p>No legal targets right now</p>}
          <button
            ref={useButton}
            className="primary"
            disabled={disabled || !actions.length}
            onClick={() => {
              const none = actions.find(
                (action) => "target" in action && action.target.kind === "NONE",
              );
              if (none) void controller.submitIntent(none);
              else controller.selectCard(response.powerInstanceId);
            }}
          >
            Use now · 0
          </button>
        </>
      )}
      <button
        disabled={disabled || !keep}
        onClick={() => {
          if (keep) void controller.submitIntent(keep);
        }}
      >
        Keep for later
      </button>
    </section>
  );
}
