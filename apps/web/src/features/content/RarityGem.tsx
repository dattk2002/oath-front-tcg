import { useId } from "react";
import type { CardRarity } from "@oathfront/contracts/browser";

import { rarities, rarityGradient } from "./rarity-visuals";

export function rarityLabel(rarity: CardRarity) {
  return `${rarity} · ${rarities[rarity].name}`;
}

/** One geometry source for card sockets and all textual rarity badges. */
export function RaritySymbol({ rarity }: { rarity: CardRarity }) {
  const id = useId().replaceAll(":", "");
  const gem = rarities[rarity];
  return (
    <svg
      className="rarity-symbol"
      data-shape={gem.shape}
      viewBox="0 0 64 64"
      width={18}
      height={18}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2="1" y2="1">
          {rarityGradient(rarity).map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        <clipPath id={`facet-${id}`}>
          <polygon points={gem.points} />
        </clipPath>
      </defs>
      <polygon
        points={gem.points}
        fill={`url(#gem-${id})`}
        stroke="#f5efdc"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#facet-${id})`}>
        <path
          d="M0 0 32 29 64 0M0 64 32 29 64 64"
          fill="none"
          stroke="#fff"
          strokeOpacity=".65"
          strokeWidth="2"
        />
        <path d="M0 0 32 29 0 64Z" fill="#fff" fillOpacity=".2" />
        <path d="M64 0 32 29 64 64Z" fill="#191927" fillOpacity=".22" />
      </g>
    </svg>
  );
}

export function RarityGem({ rarity }: { rarity: CardRarity }) {
  const gem = rarities[rarity];
  return (
    <span
      className="rarity-gem card-rarity-gem"
      data-rarity={rarity}
      data-shape={gem.shape}
      role="img"
      aria-label={`${rarity} · ${gem.name} rarity`}
      title={`${rarity} · ${gem.name}`}
    >
      <RaritySymbol rarity={rarity} />
      <span aria-hidden="true">{rarity}</span>
    </span>
  );
}
