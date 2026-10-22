import { useId } from "react";
import type { CardRarity } from "@oathfront/contracts/browser";

const rarities = {
  U: { name: "Uncommon", shape: "triangle", points: "32,5 59,55 5,55" },
  R: { name: "Rare", shape: "square", points: "10,10 54,10 54,54 10,54" },
  SR: {
    name: "Super Rare",
    shape: "pentagon",
    points: "32,4 60,25 49,58 15,58 4,25",
  },
  SL: {
    name: "Super Legendary",
    shape: "hexagon",
    points: "18,6 46,6 61,32 46,58 18,58 3,32",
  },
  E: {
    name: "Event",
    shape: "crest",
    points:
      "10,7 25,13 32,4 39,13 54,7 58,35 48,35 46,50 32,61 18,50 16,35 6,35",
  },
} as const;

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
          <stop
            offset="0"
            stopColor={rarity === "SL" ? "#a9f1ee" : "#fff8e6"}
          />
          <stop
            offset=".35"
            stopColor={
              rarity === "SL"
                ? "#b7a0f7"
                : `var(--rarity-${rarity.toLowerCase()})`
            }
          />
          <stop
            offset=".72"
            stopColor={
              rarity === "SL"
                ? "#f4b3c7"
                : `var(--rarity-${rarity.toLowerCase()})`
            }
          />
          <stop
            offset="1"
            stopColor={rarity === "SL" ? "#f3eaa5" : "#51445a"}
          />
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
