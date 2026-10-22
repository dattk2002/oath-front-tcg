import { type CSSProperties, type ReactNode } from "react";
import type {
  CardDefinitionView,
  TokenDefinitionView,
} from "@oathfront/contracts/browser";
import { contentName, contentText } from "../../content/english-content";
import ArtImage from "../match/ArtImage";
import { SystemBadge } from "./ContentBadges";
import { RarityGem } from "./RarityGem";
export { RarityGem } from "./RarityGem";

/** Presentation only; parents own card activation, selection and quantity controls. */
export default function CardVisual({
  definition,
  surface,
  title,
  quantity,
  artRetry = false,
  eager = false,
}: {
  definition: CardDefinitionView | TokenDefinitionView;
  surface: "collection" | "preview" | "inspect" | "hand" | "showcase";
  title?: ReactNode;
  quantity?: number;
  artRetry?: boolean;
  eager?: boolean;
}) {
  const collectible = "cost" in definition;
  const trick = "type" in definition && definition.type === "TRICK";
  const rarity = collectible ? definition.rarity : undefined;
  const rules = contentText(definition.id);
  return (
    <span
      className="card-face card-visual"
      data-card-id={definition.id}
      data-card-type={trick ? "TRICK" : collectible ? "UNIT" : "TOKEN"}
      data-surface={surface}
      data-kind={trick ? "trick" : collectible ? "unit" : "token"}
      data-rarity={rarity}
      data-system={collectible ? (definition.classId ?? "NEUTRAL") : undefined}
      style={
        rarity
          ? ({
              "--card-gem": `var(--rarity-${rarity.toLowerCase()})`,
            } as CSSProperties)
          : undefined
      }
    >
      <span className="card-face-frame" aria-hidden="true" />
      <span
        className={`card-face-art${surface === "hand" ? " hand-art" : surface === "collection" ? " card-art" : ""}`}
      >
        <ArtImage
          artKey={definition.artKey}
          name={contentName(definition.id)}
          variant={
            surface === "inspect" || surface === "showcase"
              ? "inspect"
              : "thumb"
          }
          retry={artRetry}
          eager={eager}
        />
      </span>
      {collectible && (
        <span
          className="card-face-cost"
          aria-label={`${definition.cost} energy`}
        >
          {definition.cost}
        </span>
      )}
      {collectible && (
        <span className="card-face-system">
          <SystemBadge system={definition.classId} />
        </span>
      )}
      {quantity !== undefined && (
        <span className="card-face-quantity" aria-label={`${quantity} copies`}>
          ×{quantity}
        </span>
      )}
      <span className="card-face-plate">
        <span className="card-face-kind">
          {trick ? "Trick" : collectible ? "Unit" : "Token"}
        </span>
        <strong className="card-face-title">
          {title ?? contentName(definition.id)}
        </strong>
        <span className="card-face-rules">{rules}</span>
      </span>
      <span className="card-face-footer">
        {!trick && definition.printed && (
          <span
            className="card-face-stat card-face-attack"
            aria-label={`${definition.printed.attack} attack`}
          >
            <b>{definition.printed.attack}</b>
            <small>ATK</small>
          </span>
        )}
        {rarity && <RarityGem rarity={rarity} />}
        {!trick && definition.printed && (
          <span
            className="card-face-stat card-face-health"
            aria-label={`${definition.printed.hp} health`}
          >
            <b>{definition.printed.hp}</b>
            <small>HP</small>
          </span>
        )}
      </span>
    </span>
  );
}
