import type { NewsCategory, NewsSection } from "@oathfront/contracts";
import { contentHash, seasonOne } from "./season-one.js";
export interface AuthoredPost {
  slug: string;
  revision: number;
  title: string;
  excerpt: string;
  body: NewsSection[];
  category: NewsCategory;
  artKey: string;
  state: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  publishAt: string;
  sha256: string;
}
const post = (
  slug: string,
  title: string,
  excerpt: string,
  category: NewsCategory,
  artKey: string,
  body: NewsSection[],
): AuthoredPost => {
  const p = {
    slug,
    revision: 1,
    title,
    excerpt,
    body,
    category,
    artKey,
    state: "PUBLISHED" as const,
    publishAt: "2026-10-22T12:30:00.000Z",
  };
  return { ...p, sha256: contentHash(p) };
};
export const launchPosts: AuthoredPost[] = [
  post(
    "building-the-fivefold",
    "Building the Fivefold",
    "Four arenas frame a shared five-lane battlefield. Their visual identity supports the decisions at its center.",
    "NEWS",
    "features/five-lane-tactics.webp",
    [
      {
        heading: "A world around five decisions",
        paragraphs: [
          "OathFront is a browser PvE card battler. Dawnward and the Ashen Court face each other across five ordered lanes. A placement answers two questions at once: what can this unit do now, and what will it protect when combat reaches this lane?",
          "The board is the center of the Fivefold. Its environments place architecture, vegetation and energy around the lanes while keeping health, attack, costs and legal targets visible. Arena art is cosmetic; it never adds a hidden stat bonus.",
        ],
      },
      {
        heading: "Four places to take your stand",
        paragraphs: [
          "Moonroot Conservatory combines weathered stone with living growth. Cinder Foundry frames the battlefield with industrial heat. Glasswater Sanctum uses cold glass and tidal forms. Astral Causeway places the duel among suspended structures and distant light.",
          "Location rules remain separate from those backgrounds. A revealed volcano or healing spring affects its marked lane exactly as its rule text says. Inspect the location before placing a unit; scenery alone does not tell you which rule is active.",
        ],
      },
      {
        heading: "Built for the browser",
        paragraphs: [
          "The current development build supports guest PvE and account saves. Keyboard navigation, a compact screen fallback and reduced-motion presentation are part of the same game surface. They preserve the tactical information even when a cinematic view is not suitable for the device.",
        ],
      },
    ],
  ),
  post(
    "meet-the-living-bastion",
    "Briar's twofold oath",
    "Grove and Terra give Briar a distinct defensive identity without separating the hero from the shared deck rules.",
    "GUIDE",
    "heroes/h_g_bv/portrait.webp",
    [
      {
        heading: "Growth meets defense",
        paragraphs: [
          "Briar combines Grove and Terra. Grove supports recovery and lasting units; Terra supplies Shield, Armor and persistent defense. The pairing rewards protecting a useful position long enough for it to matter again, rather than treating every unit as disposable damage.",
          "Briar's shared powers are Verdant Pulse, Rootguard and Oathshield, alongside the hero's personal signature. Each normal power use costs one energy. A newly granted block power can be used immediately for free in its response window, or kept for a later legal play phase.",
        ],
      },
      {
        heading: "Build both halves",
        paragraphs: [
          "An elements_v1 deck has exactly 30 cards, with no more than two copies of a card. Include at least six Grove cards and six Terra cards. Neutral cards can fill gaps, up to twelve copies in total. Card origin does not add a faction restriction to this new catalog.",
          "The free Briar preset meets those rules without an Event card. Weekly collectibles add options; they are not required to start playing. Read the system symbols and rule text before changing a preset, especially when a defensive unit has a trigger that only runs once per turn.",
        ],
      },
      {
        heading: "An identity beyond green armor",
        paragraphs: [
          "The visual direction distinguishes Briar's grounded human shield-knight silhouette from Cairn's suspended stone anatomy and Rowan's amphibious form. Their materials and movement should communicate different personalities before a player reads the nameplate.",
        ],
      },
    ],
  ),
  post(
    "every-card-tells-a-story",
    "Reading OathFront's five rarities",
    "U, R, SR, SL and E use distinct crests and frames while keeping card rules easy to read.",
    "GUIDE",
    "features/collectible-cards.webp",
    [
      {
        heading: "Five marks, one readable card",
        paragraphs: [
          "U means Uncommon and uses silver. R means Rare and uses gold. SR means Super Rare and uses purple. SL means Super Legendary and uses a rainbow frame. E means Event and uses red-orange. Each mark includes its letter code, so recognizing a rarity does not depend on color alone.",
          "Frames sit around the illustration and rules. They do not replace attack, health, energy cost or system membership. A prismatic border is a collectible identity, not an extra combat modifier.",
        ],
      },
      {
        heading: "The base collection stays open",
        paragraphs: [
          "All 60 base cards remain available at two copies. Their new rarity labels do not lock existing cards behind tickets. The initial collection contains 24 Uncommon, 18 Rare, 12 Super Rare and 6 Super Legendary base cards.",
          "Twelve new Event units join the first weekly season. An account must earn a copy before adding it to a saved deck or starting a normal match with it. Borrowed daily challenge decks can include the spotlight card without granting ownership of that card.",
        ],
      },
      {
        heading: "Read the trigger",
        paragraphs: [
          "On-play, before-combat, damaged, destroyed and end-turn abilities happen at different moments. Inspect a card for its full wording. Shield, Armor and Pierce remain gameplay keywords with their own rules; rarity is never a substitute for those rules.",
        ],
      },
    ],
  ),
  post(
    "readability-comes-first",
    "A clearer view of every decision",
    "The development update brings system emblems, rarity frames and match-bound card rules into one presentation.",
    "UPDATE",
    "features/two-system-heroes.webp",
    [
      {
        heading: "One source for a match",
        paragraphs: [
          "A match keeps the content version with which it was created. The new elements_v1 release introduces eight systems and 72 collectible cards. Existing core_v1 and heroes_v1 matches retain their earlier card and power definitions, including when a session is resumed.",
          "Previewing an action uses the same version as that match. A preview cannot reveal hidden draws or an opponent's concealed choices. When information is unknown, the interface must describe the uncertainty instead of promising an exact future state.",
        ],
      },
      {
        heading: "Feedback that serves the board",
        paragraphs: [
          "Target outlines, energy, phase labels and card names remain above battlefield decoration. Rarity and hero art use consistent identities across selection, collection, hand and inspection. Reduced-motion presentation retains the resulting state without requiring the player to follow an animation.",
          "If an asset or network request fails, the screen should retain a readable name and a clear recovery action. An interrupted reveal never determines whether an account owns a card; the server's reward record does.",
        ],
      },
      {
        heading: "What the benchmark tells us",
        paragraphs: [
          "The first elements_v1 check ran 100 seeded Normal-bot matches across all 20 heroes, one game for every opposing-hero pairing. It found no simulation faults: Dawnward won 56, the Ashen Court won 40, and four games drew. The median match lasted 11 turns.",
          "That small automated sample verifies execution and highlights matchups to watch. It does not establish competitive balance, represent human win rates or replace device and player testing. No base-card stat change was made from that sample alone.",
        ],
      },
    ],
  ),
  post(
    "inside-the-ashen-court",
    "Inside the Ashen Court",
    "Ten distinct heroes share a faction phase order, not a single visual template or deck identity.",
    "NEWS",
    "features/two-system-heroes.webp",
    [
      {
        heading: "A faction with many silhouettes",
        paragraphs: [
          "The Ashen Court roster includes Cinder, Vesper, Morrow, Rook, Nyxara, Brimstone, Sable, Vanta, Gravemarch and Scoria. Their design direction ranges from a human industrial brawler to a hollow bell-cage machine, with separate materials, equipment and movement motifs.",
          "The roster audit compares silhouette, anatomy, equipment, material, motif and pose. Changing a hue alone does not create a new identity. Similar heroes are revised at the character level, then carried through the portrait, battlefield crop and larger artwork.",
        ],
      },
      {
        heading: "Two systems shape each hero",
        paragraphs: [
          "Cinder combines Forge and Terra; Morrow combines Arcane and Umbral; Vanta combines Tide and Umbral. Each pair supports different card choices and a different set of shared powers. Every hero also keeps a personal signature power.",
          "The faction still controls timing. The Ashen Court deploys units first, Dawnward plays units and tricks next, and the Ashen Court then gets its trick window. Combat follows across lanes one through five. A hero's systems do not change that phase sequence.",
        ],
      },
      {
        heading: "Try the other side",
        paragraphs: [
          "Daily expeditions alternate perspectives during the week. Some scenarios put the spotlight unit in the opposing deck so that both sides remain legal under their hero systems. The featured-card showcase gives the human player a compatible borrowed hero and the card in hand.",
        ],
      },
    ],
  ),
  post(
    "two-sides-one-battlefield",
    "First Light, Long Shadows begins October 26",
    "The first development season schedules twelve weekly cards, seven daily challenges per week and permanent collection rewards.",
    "NEWS",
    "features/weekly-expeditions.webp",
    [
      {
        heading: "A Monday reset",
        paragraphs: [
          "The first weekly event is scheduled for October 26, 2026 at 07:00 in Vietnam, which is 00:00 UTC. A new week begins each Monday at that same time. The twelve-week calendar ends on January 18, 2027; it does not silently loop into another reward season.",
          "Each week reveals one Event unit. Future weeks show their dates before revealing their spotlight details. Before launch, the event hub is an upcoming schedule. These announcements describe OathFront's development season, not a separately announced production deployment.",
        ],
      },
      {
        heading: "Earn copies through play",
        paragraphs: [
          "One rewarded daily win earns 100 tickets. Completing three different days adds 200, and completing five adds another 300. Seven daily wins therefore total 1,200 tickets and earn the first permanent copy. Reaching 2,400 earns a second copy; seven completed days also unlock a cosmetic badge.",
          "Account PvE wins earn 50 tickets, plus 50 for each matching featured hero system, up to 200 PvE tickets per server day. Daily challenge rewards do not consume that cap. Ticket totals are separate for each week; owned cards remain in the account collection.",
        ],
      },
      {
        heading: "A loss is a pause, not a lost day",
        paragraphs: [
          "After a daily defeat or surrender, wait one hour before trying again. Disconnecting resumes the same active attempt and does not start the loss cooldown. A started challenge can finish within its server-defined 24-hour grace period; it still credits the original day and week.",
          "Google accounts receive tickets and permanent rewards. Guests can practice available challenges without account rewards. Signing in after a guest match starts does not retroactively make that match eligible. There is no ticket purchase or paid cooldown bypass in this season.",
        ],
      },
    ],
  ),
];
export const eventPosts: AuthoredPost[] = seasonOne.map((week) => {
  const p: Omit<AuthoredPost, "sha256"> = {
    slug: week.slug,
    revision: 1,
    title: week.title,
    excerpt: week.summary,
    body: [
      {
        heading: "This week's expedition",
        paragraphs: [
          `${week.title} runs from ${week.startsAt.slice(0, 10)} to ${week.endsAt.slice(0, 10)}, with resets at 07:00 Vietnam time. The spotlight card is ${week.featuredCardId}; its two featured systems are ${week.systems.join(" and ")}.`,
          "Play seven authored challenges with borrowed decks. Each daily win can earn its reward once; a defeat or surrender starts a one-hour retry cooldown. Your normal saved decks and owned card copies are unaffected by borrowing a challenge deck.",
        ],
      },
      {
        heading: "Your collection milestones",
        paragraphs: [
          "Earn 1,200 weekly tickets for the first permanent copy and 2,400 for the second. Three daily completions add 200 tickets; five add 300. Completing all seven days earns the week's cosmetic badge.",
          "Weekly tickets do not carry into the next event. Account-owned cards remain available after the event closes. Guests may practice available scenarios but do not earn account rewards.",
        ],
      },
    ],
    category: "EVENT" as const,
    artKey: `cards/${week.featuredCardId.toLowerCase()}.webp`,
    state: "SCHEDULED" as const,
    publishAt: week.revealAt,
  };
  return { ...p, sha256: contentHash(p) };
});
export const editorialPosts = [...launchPosts, ...eventPosts];
