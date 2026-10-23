import { createPortal } from "react-dom";
import type { PublicCatalog } from "@oathfront/contracts";
import CardVisual from "../content/CardVisual";
import type { CardDragController } from "./use-card-drag";

export default function CardDragPreview({
  drag,
  catalog,
}: {
  drag: CardDragController;
  catalog: PublicCatalog;
}) {
  const definition = drag.visual
    ? [...catalog.cards, ...catalog.tokens].find(
        (card) => card.id === drag.visual!.definitionId,
      )
    : null;
  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {drag.announcement}
      </p>
      {definition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={drag.previewRef}
            className="courtyard-drag-preview"
            aria-hidden="true"
            data-returning={drag.visual?.returning}
          >
            <CardVisual definition={definition} surface="hand" />
            <span className="drag-drop-status">Release to play</span>
          </div>,
          document.body,
        )}
    </>
  );
}
