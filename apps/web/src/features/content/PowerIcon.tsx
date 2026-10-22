import type { PowerDefinitionView } from "@oathfront/contracts/browser";

// Effect silhouettes stay distinct even without their system color or label.
const glyphs: Record<string, string> = {
  P_GROVE1:
    "M16 27V16M16 20C5 20 5 10 5 10c9 0 11 5 11 10ZM16 16c0-9 11-10 11-10s1 11-11 10M23 23v6m-3-3h6",
  P_GROVE2: "M16 4 7 8v9c0 5 9 11 9 11s9-6 9-11V8ZM16 10v12m-5-8 5 5 5-5",
  P_TERRA1: "M16 4 6 8v9c0 6 10 11 10 11s10-5 10-11V8ZM11 16l4 4 7-9",
  P_TERRA2:
    "M9 7 23 7 28 16 23 25 9 25 4 16ZM9 7l4 9-4 9m14-18-4 9 4 9m-10-9h6",
  P_TIDE1:
    "M4 21c4-10 8 4 14-4s11-6 10 1M5 10h20m-6-5 6 5-6 5M5 27c5-6 9 3 15-3",
  P_TIDE2: "M8 5v18m7-18v18M4 28c5-6 12 4 20-2M22 8v10m-5-5h10",
  P_TEMPEST1: "M4 9h15l-4-4m4 4-4 4M3 18h23l-5-5m5 5-5 5M6 26h9",
  P_TEMPEST2: "M19 3 6 18h9l-2 11L27 13h-9Z",
  P_SOLAR1:
    "M16 3v5m0 16v5M3 16h5m16 0h5M7 7l4 4m10 10 4 4M7 25l4-4m10-10 4-4M16 10l-5 10h10Z",
  P_SOLAR2: "M6 19h20l-4 8H10ZM16 4v11m-5-6h10M5 10l3 3m16 0 3-3",
  P_FORGE1:
    "m6 5 5 5-1 5-5 1-3-4c-1 6 4 10 9 8l9 9 5-5-9-9c2-6-2-10-8-10ZM22 4v8m-4-4h8",
  P_FORGE2:
    "M7 25a13 13 0 1 1 18 0M16 6v4M7 11l3 3m15-3-3 3M9 23h14M16 21l5-9M13 24h6",
  P_ARCANE1:
    "M2 16s6-9 14-9 14 9 14 9-6 9-14 9S2 16 2 16ZM16 11a5 5 0 1 0 0 10 5 5 0 0 0 0-10M16 2v3m0 22v3",
  P_ARCANE2: "M9 4v24M23 4v24M5 8h22M5 24h22M16 11l4 5-4 5-4-5Z",
  P_UMBRAL1:
    "M16 3s-9 10-9 16a9 9 0 0 0 18 0c0-6-9-16-9-16ZM11 20l3 3m4-3 3 3M16 12v3",
  P_UMBRAL2: "M16 3 28 16 16 29 4 16ZM11 16h10M8 6l-3-3m19 23 3 3",
  S_G_BV:
    "M16 4 6 9v9c0 6 10 11 10 11s10-5 10-11V9ZM16 23V11m0 6-5-5m5 9 6-6M3 6l-1 6m27-6 1 6",
  S_G_BP:
    "M16 3 25 12 16 24 7 12ZM7 12h18M16 3l-3 9 3 12 3-12ZM4 23l-2 5m26-5 2 5",
  S_G_VP:
    "M4 22c7 0 4-12 11-12h11m-6-6 6 6-6 6M5 28h8M5 4l2 3M14 22l3 3 3-3-3-3Z",
  S_E_FX:
    "M6 24h20l-4-6v-6a6 6 0 0 0-12 0v6ZM13 28h6M16 2v3M3 12v7m26-7v7M16 12l-3 6h6Z",
  S_E_FS: "M5 27 10 16 24 3 29 8 16 22ZM10 16l6 6M3 15l14 14M3 5c4 0 7 3 7 7",
  S_E_XS:
    "M3 12c5-8 8 5 13-3s10-4 13 0M3 21c5-8 8 5 13-3s10-4 13 0M16 24v5m-3-2h6",
  S_G_SOL:
    "M16 8 8 12v7c0 5 8 9 8 9s8-4 8-9v-7ZM16 2v3M3 10l3 2m20 0 3-2M12 17h8m-4-4v8",
  S_G_CAI:
    "M16 3 5 9v13l11 7 11-7V9ZM5 9l11 7 11-7M16 16v13M10 6l12 8M9 19v4m14-4v4",
  S_G_ZEP: "M3 9h25m-6-6 6 6-6 6M29 23H4m6-6-6 6 6 6M10 16h12",
  S_G_MER: "M7 3h18M7 29h18M9 3v7l14 12v7M23 3v7L9 22v7M12 24h8M13 8h6",
  S_G_MOS: "M16 3 5 8v10c0 6 11 11 11 11s11-5 11-11V8ZM16 10v12m-6-6h12M12 5h8",
  S_G_HAL: "M16 4v23M16 12 5 7v9l11 7 11-7V7ZM5 16l-3 3m25-3 3 3M12 28h8",
  S_G_ROW:
    "M16 28V14M16 20C6 20 4 10 4 10c9 0 12 5 12 10ZM16 14C16 5 26 4 26 4s0 10-10 10M5 27h22",
  S_E_ROO:
    "M16 3v6m0 14v6M3 16h6m14 0h6M24 8 8 24M16 7a9 9 0 1 0 0 18 9 9 0 0 0 0-18M21 3h8v8",
  S_E_NYX: "M3 26 26 3l3 3L6 29ZM21 8l3 3M6 4c-5 15 23 9 19 24M5 3l3 4",
  S_E_BRI:
    "M16 3 12 13 6 8 4 22 10 28h13l5-8-6-10-2 8ZM16 16l-3 7h6M5 3l2 3m19-3-2 3",
  S_E_SAB: "M16 3v26M7 8h18M9 8 4 20h10ZM23 8l-5 12h10ZM10 29h12M12 4h8",
  S_E_VAN:
    "M24 3 9 13l8 6ZM8 29l15-10-8-6ZM3 9c0 6 2 9 6 10m20-10c0 6-2 9-6 10",
  S_E_GRA:
    "M6 24h20l-4-6v-6a6 6 0 0 0-12 0v6ZM13 28h6M16 2v3M3 7l3 3m23-3-3 3M13 14h6m-3-3v8",
  S_E_SCO:
    "M11 3h10M13 3v8L5 24q-1 4 4 4h14q5 0 4-4l-8-13V3M9 20h14M16 14v8m-4-4h8",
};
export default function PowerIcon({
  power,
  signature = false,
}: {
  power: PowerDefinitionView;
  signature?: boolean;
}) {
  return (
    <span
      className={`power-icon${signature ? " power-icon-signature" : ""}`}
      data-system={power.classId ?? "ARCANE"}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d={glyphs[power.id] ?? "M16 3 28 16 16 29 4 16ZM16 10v12m-6-6h12"}
        />
      </svg>
    </span>
  );
}
