import { useEffect, useState } from "react";
import type {
  CreateMatchRequest,
  DeckDTO,
  DeckInput,
  HeroId,
  MatchSummary,
  PublicCatalog,
} from "@oathfront/contracts/browser";
import { useRouter } from "next/navigation";
import type { ApiClient } from "../match/api-client";
import { presetNames } from "../hero/HeroInspect";
import { restorePresetCreate } from "../setup/pending-create";
import HeroSelect from "../hero/HeroSelect";
import DeckList from "./DeckList";
import DeckBuilder from "./DeckBuilder";
import PresetSetup from "../setup/PresetSetup";
type Source = Extract<CreateMatchRequest, { mode: "SKIRMISH" }>["deck"];
export default function DeckScreen({
  screen,
  heroId,
  deckId,
  presetId,
  reviewMatchId,
  catalog,
  api,
}: {
  screen: "setup" | "decks" | "builder" | "review";
  heroId?: string;
  deckId?: string;
  presetId?: string;
  reviewMatchId?: string;
  catalog: PublicCatalog;
  api: ApiClient;
}) {
  const router = useRouter();
  const [restored, setRestored] = useState(() =>
    typeof sessionStorage === "undefined"
      ? null
      : restorePresetCreate(catalog.presets, sessionStorage, catalog.version),
  );
  const [restoredHero, setRestoredHero] = useState<HeroId | null>(
    restored?.heroId ?? null,
  );
  const [resolvingRestored, setResolvingRestored] = useState(
    restored?.request.mode === "SKIRMISH" &&
      restored.request.deck.kind === "SAVED",
  );
  useEffect(() => {
    const request = restored?.request;
    if (request?.mode !== "SKIRMISH" || request.deck.kind !== "SAVED") return;
    let active = true;
    void api.deck(request.deck.deckId, request.deck.deckRevision).then(
      (d) => {
        if (active) {
          setRestoredHero(d.heroId);
          setResolvingRestored(false);
        }
      },
      () => {
        if (active) setResolvingRestored(false);
      },
    );
    return () => {
      active = false;
    };
  }, [api, restored]);

  const [selected, setSelected] = useState<{
      source: Source;
      heroId: HeroId;
    } | null>(null),
    [loaded, setLoaded] = useState<{
      deck: DeckInput;
      saved?: DeckDTO;
      summary?: MatchSummary;
    } | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (screen !== "builder" && screen !== "review") return;
    let active = true;
    setLoaded(null);
    setError("");
    void (async () => {
      try {
        let result: {
          deck: DeckInput;
          saved?: DeckDTO;
          summary?: MatchSummary;
        };
        if (screen === "review" && reviewMatchId) {
          const summary = await api.summary(reviewMatchId);
          if (!summary.rematch) throw Error();
          const source = summary.rematch.deck;
          if (source.kind === "SAVED") {
            const saved = await api.deck(source.deckId, source.deckRevision);
            result = {
              deck: {
                name: saved.name,
                heroId: saved.heroId,
                entries: saved.entries,
                contentVersion: saved.contentVersion,
              },
              saved,
              summary,
            };
          } else {
            const preset = catalog.presets.find(
              (p) => p.presetId === source.presetId,
            );
            if (!preset) throw Error();
            result = {
              deck: {
                name: preset.name,
                heroId: preset.heroId,
                entries: preset.entries,
                contentVersion: catalog.version,
              },
              summary,
            };
          }
        } else if (deckId) {
          const saved = await api.deck(deckId);
          result = {
            deck: {
              name: saved.name,
              heroId: saved.heroId,
              contentVersion: saved.contentVersion,
              entries: saved.entries,
            },
            saved,
          };
        } else {
          const hero = catalog.heroes.find((h) => h.id === heroId);
          if (!hero) throw Error();
          const preset = presetId
            ? catalog.presets.find(
                (p) => p.presetId === presetId && p.heroId === hero.id,
              )
            : null;
          if (presetId && !preset) throw Error();
          result = {
            deck: {
              name: preset
                ? `${presetNames[preset.presetId]} · bản sao`
                : "Bộ bài mới",
              heroId: hero.id,
              entries: preset?.entries ?? [],
              contentVersion: catalog.version,
            },
          };
        }
        if (active) setLoaded(result);
      } catch {
        if (active)
          setError(
            "Không tải được đúng nguồn bộ bài. Bản gốc không được thay thế.",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [screen, reviewMatchId, deckId, heroId, presetId, catalog, api, attempt]);
  function chooseAgain() {
    setRestored(null);
    setSelected(null);
    router.push("/heroes");
  }
  if (resolvingRestored)
    return <p role="status">Đang khôi phục đúng nguồn bộ bài…</p>;
  if (restored)
    return (
      <PresetSetup
        catalog={catalog}
        api={api}
        initialRequest={restored.request}
        {...(restoredHero ? { selectedHeroId: restoredHero } : {})}
        {...(restored.request.mode === "SKIRMISH" &&
        restored.request.deck.kind === "SAVED" &&
        restoredHero
          ? { selectedSource: restored.request.deck }
          : {})}
        onRejected={chooseAgain}
        onCreated={(r) => router.push(`/matches/${r.view.matchId}`)}
        onResume={(id) => router.push(`/matches/${id}`)}
      />
    );
  if (selected)
    return (
      <PresetSetup
        catalog={catalog}
        api={api}
        selectedSource={selected.source}
        selectedHeroId={selected.heroId}
        onBack={() => setSelected(null)}
        onRejected={chooseAgain}
        onCreated={(r) => router.push(`/matches/${r.view.matchId}`)}
        onResume={(id) => router.push(`/matches/${id}`)}
      />
    );
  if (screen === "setup") return <HeroSelect catalog={catalog} />;
  if (screen === "decks") {
    const hero = catalog.heroes.find((h) => h.id === heroId);
    if (!hero) return <p role="alert">Không tìm thấy hero.</p>;
    return (
      <DeckList
        catalog={catalog}
        heroId={hero.id}
        api={api}
        onSelect={(source) => setSelected({ source, heroId: hero.id })}
      />
    );
  }
  if (error)
    return (
      <section className="status-panel panel" role="alert">
        <h1>Chưa thể mở bộ bài</h1>
        <p>{error}</p>
        <button onClick={() => setAttempt((n) => n + 1)}>
          Thử lại nguồn bộ bài
        </button>
      </section>
    );
  if (!loaded) return <p role="status">Đang tải bộ bài…</p>;
  return (
    <DeckBuilder
      key={`${deckId ?? heroId ?? reviewMatchId}.${attempt}`}
      catalog={catalog}
      api={api}
      initial={loaded.deck}
      {...(loaded.saved ? { saved: loaded.saved } : {})}
      {...(loaded.summary?.rematch
        ? {
            review: {
              matchId: loaded.summary.matchId,
              config: loaded.summary.rematch,
            },
          }
        : {})}
      onContinue={(d) =>
        setSelected({
          source: { kind: "SAVED", deckId: d.id, deckRevision: d.revision },
          heroId: d.heroId,
        })
      }
    />
  );
}
