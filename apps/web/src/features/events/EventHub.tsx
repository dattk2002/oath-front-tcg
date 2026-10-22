"use client";
import SessionRecovery from "../auth/SessionRecovery";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  EventSummary,
  PublicCatalog,
  SessionResponse,
  WeeklyProgressView,
} from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";
import { ApiError } from "../match/api-error";
import { useLiveRead } from "../content/use-live-read";
import { ReadError } from "../campaign/LiveNews";
import { CampaignArtwork } from "../campaign/CampaignArtwork";
import { RarityBadge, SystemBadges } from "../content/ContentBadges";
import { artById } from "../match/rendering/asset-manifest";
import { contentName, contentText } from "../../content/english-content";
import {
  dateLabel,
  countdownLabel,
  eventCategory,
  legacyEventSlugs,
} from "./model";
import { useServerClock } from "./use-server-clock";
import { useDailyStart } from "./use-daily-start";
import { useUiMotion } from "../motion/use-ui-motion";
export interface EventSessionProps {
  api: ApiClient;
  catalog: PublicCatalog | null;
  session: SessionResponse | null;
  ready: boolean;
  ensureSession: () => Promise<SessionResponse>;
  onSignIn: () => void;
}
function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      className="weekly-card"
      href={`/events/${event.slug}`}
      data-status={event.status}
    >
      <div className="weekly-card-art">
        {event.revealed && event.cardId ? (
          <CampaignArtwork
            className="contain"
            src={artById(event.cardId)!.inspect!}
            alt=""
          />
        ) : (
          <div className="unrevealed-card" aria-hidden="true">
            <span>?</span>
            <small>WEEK {event.week.toString().padStart(2, "0")}</small>
          </div>
        )}
      </div>
      <div>
        <p className="kicker">
          Week {event.week} ·{" "}
          {event.status === "ACTIVE"
            ? "Live now"
            : event.status === "ENDED"
              ? "Archive"
              : "Upcoming"}
        </p>
        <h2>{event.title}</h2>
        <p>
          <time dateTime={event.startsAt}>{dateLabel(event.startsAt)}</time> —{" "}
          {dateLabel(event.endsAt)}
        </p>
        <p>
          {event.revealed
            ? "Discover the card and seven daily challenges."
            : `Card reveals ${dateLabel(event.revealAt)} at 07:00 Vietnam time.`}
        </p>
      </div>
    </Link>
  );
}
export function EventHub(
  props: EventSessionProps & {
    slug?: string | undefined;
    filter?: string | undefined;
  },
) {
  if (props.slug && legacyEventSlugs.has(props.slug))
    return (
      <section className="event-archive-note">
        <p className="kicker">Archived design preview</p>
        <h1>This was an event concept.</h1>
        <p>
          The earlier preview had no live dates, registration or rewards. The
          playable season now has its own published schedule.
        </p>
        <Link className="campaign-button" href="/events">
          Explore weekly events
        </Link>
      </section>
    );
  return props.slug ? (
    <WeeklyDetail key={props.slug} {...props} slug={props.slug} />
  ) : (
    <EventIndex api={props.api} filter={props.filter} />
  );
}
function EventIndex({
  api,
  filter,
}: {
  api: ApiClient;
  filter?: string | undefined;
}) {
  const read = useLiveRead("weekly-events", () => api.weeklyEvents());
  const category = eventCategory(filter),
    items = read.data?.items.filter(
      (e) => category === "ALL" || e.status === category,
    );
  return (
    <div className="event-hub" data-pen-node="QXjQb">
      <header className="event-masthead">
        <CampaignArtwork
          className="event-header-art"
          src="/assets/world-v1/astral-causeway-wide.webp"
          alt=""
          eager
        />
        <div>
          <p className="kicker">Weekly expeditions</p>
          <h1>{read.data?.seasonTitle ?? "Enter the season."}</h1>
          <p>
            One spotlight card each week. Seven daily challenges. Earn your
            place in the Fivefold.
          </p>
          <p>Resets at 07:00 Vietnam time. New weeks begin Monday.</p>
        </div>
      </header>
      <section className="event-roadmap" aria-label="Weekly event schedule">
        <nav className="campaign-filters" aria-label="Event status">
          {[
            ["", "All weeks"],
            ["active", "Live now"],
            ["upcoming", "Upcoming"],
            ["archive", "Archive"],
          ].map(([id, label]) => (
            <Link
              key={id}
              href={`/events${id ? `?category=${id}` : ""}`}
              scroll={false}
              aria-current={category === eventCategory(id) ? "true" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        {read.error ? (
          <ReadError
            retry={read.refresh}
            label="The event schedule could not be loaded."
          />
        ) : !items ? (
          <p role="status">Loading the season…</p>
        ) : items.length ? (
          <div className="event-grid">
            {items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="editorial-empty">
            <h2>
              No{" "}
              {category === "ACTIVE"
                ? "live"
                : category === "ENDED"
                  ? "archived"
                  : "matching"}{" "}
              events right now.
            </h2>
            <p>The published schedule above follows server time.</p>
            <Link href="/events">All weeks</Link>
          </div>
        )}
      </section>
    </div>
  );
}
function WeeklyDetail({
  api,
  catalog,
  slug,
  session,
  ready,
  ensureSession,
  onSignIn,
}: EventSessionProps & { slug: string }) {
  const detail = useLiveRead(`week:${slug}`, () => api.weeklyEvent(slug));
  const progress = useLiveRead(
    `progress:${slug}:${session?.principal.id ?? "visitor"}:${session?.principal.kind ?? ""}`,
    () => api.weeklyProgress(slug),
    !!session,
  );
  const [practice, setPractice] = useState(false);
  const isPractice =
    session?.principal.kind !== "ACCOUNT" ||
    practice ||
    detail.data?.event.status === "ENDED";
  const daily = useDailyStart(api, ensureSession, () => {
    detail.refresh();
    progress.refresh();
  });
  const now = useServerClock(
    progress.data?.serverNow ?? detail.data?.serverNow,
  );
  const refreshedBoundary = useRef<number>(0);
  const nextBoundary = detail.data
    ? Math.min(
        ...[
          detail.data.event.revealAt,
          detail.data.event.endsAt,
          ...detail.data.scenarios.flatMap((s) => [s.startsAt, s.endsAt]),
          ...(progress.data?.daily ?? []).flatMap((d) =>
            d.retryAvailableAt ? [d.retryAvailableAt] : [],
          ),
          ...(progress.data?.practiceDaily ?? []).flatMap((d) =>
            d.retryAvailableAt ? [d.retryAvailableAt] : [],
          ),
        ]
          .map(Date.parse)
          .filter(
            (t) =>
              t >
              Date.parse(progress.data?.serverNow ?? detail.data!.serverNow),
          ),
      )
    : Infinity;
  useEffect(() => {
    if (
      now &&
      now >= nextBoundary &&
      refreshedBoundary.current !== nextBoundary
    ) {
      refreshedBoundary.current = nextBoundary;
      detail.refresh();
      progress.refresh();
    }
  }, [now, nextBoundary, detail.refresh, progress.refresh]);
  if (detail.error instanceof ApiError && detail.error.status === 404)
    return (
      <section className="event-archive-note">
        <h1>Event not found</h1>
        <Link href="/events">All events</Link>
      </section>
    );
  if (detail.error)
    return (
      <section className="event-archive-note">
        <h1>Weekly event</h1>
        <ReadError
          retry={detail.refresh}
          label="This event could not be loaded."
        />
      </section>
    );
  if (!detail.data)
    return (
      <section className="event-archive-note">
        <p role="status">Loading weekly event…</p>
      </section>
    );
  const { event, systems, rewards, scenarios } = detail.data;
  const card = catalog?.cards.find((c) => c.id === event.cardId);
  const records = isPractice
    ? (progress.data?.practiceDaily ?? progress.data?.daily)
    : progress.data?.daily;
  return (
    <article className="weekly-detail" data-pen-node="di6Pk">
      <Link className="editorial-back" href="/events">
        ← All events
      </Link>
      <header className="weekly-spotlight">
        <div>
          <p className="kicker">
            Week {event.week} ·{" "}
            {event.status === "ACTIVE"
              ? "Live now"
              : event.status === "ENDED"
                ? "Archive"
                : "Upcoming"}
          </p>
          <h1>{event.title}</h1>
          <p>
            {dateLabel(event.startsAt)} — {dateLabel(event.endsAt)} · 07:00
            Vietnam time
          </p>
          <p>
            {detail.data.description ??
              `The spotlight card reveals ${dateLabel(event.revealAt)}. Daily previews remain sealed until their release.`}
          </p>
          {systems.length > 0 && (
            <>
              <p className="kicker">
                Featured hero: {contentName(detail.data.featuredHeroId!)} · PvE
                ticket bonuses
              </p>
              <SystemBadges systems={systems} />
            </>
          )}
          {event.revealed && event.cardId && <p>{contentText(event.cardId)}</p>}
        </div>
        <div className="spotlight-card" data-rarity="E">
          <RarityBadge rarity="E" full />
          {event.revealed && event.cardId ? (
            <>
              <CampaignArtwork
                className="contain"
                src={artById(event.cardId)!.inspect!}
                alt={`${contentName(event.cardId)} event card`}
                retry
              />
              <h2>{contentName(event.cardId)}</h2>
              {card && (
                <p className="event-card-stats">
                  {card.cost} energy · {card.printed?.attack} ATK /{" "}
                  {card.printed?.hp} HP
                </p>
              )}
            </>
          ) : (
            <div className="unrevealed-card">
              <span aria-hidden="true">?</span>
              <h2>Unrevealed card</h2>
              <p>Reveals {dateLabel(event.revealAt)}</p>
            </div>
          )}
        </div>
      </header>
      {!session || session.principal.kind === "GUEST" ? (
        <section className="event-account-gate">
          <h2>Practice freely. Earn with your account.</h2>
          <p>
            Guest practice uses a borrowed deck and awards no tickets or cards.
            Sign in with Google before starting a rewarded challenge.
          </p>
          <button type="button" onClick={onSignIn}>
            Sign in with Google for rewards
          </button>
        </section>
      ) : (
        <p className="event-account-note">
          Account rewards enabled · Earned cards stay in your collection
          permanently.
        </p>
      )}
      {progress.error ? (
        <ReadError
          retry={progress.refresh}
          label="Your progress could not be loaded. Refresh it before starting."
        />
      ) : progress.data ? (
        <TicketProgress
          progress={progress.data}
          first={rewards.firstCopy}
          second={rewards.secondCopy}
        />
      ) : session ? (
        <p role="status">Loading your progress…</p>
      ) : null}
      <section className="daily-section">
        <SessionRecovery />
        <header>
          <div>
            <p className="kicker">Seven prepared battles</p>
            <h2>Your daily expedition.</h2>
            <p>
              Play a prebuilt scenario with a borrowed hero and deck. Borrowed
              cards do not enter your collection. Defeat or surrender means a
              one-hour wait; disconnecting keeps your active battle.
            </p>
          </div>
          {session?.principal.kind === "ACCOUNT" &&
            event.status !== "ENDED" && (
              <fieldset className="challenge-mode">
                <legend>Challenge mode</legend>
                <label>
                  <input
                    type="radio"
                    name="challenge-mode"
                    checked={!practice}
                    onChange={() => setPractice(false)}
                  />
                  Account rewards
                </label>
                <label>
                  <input
                    type="radio"
                    name="challenge-mode"
                    checked={practice}
                    onChange={() => setPractice(true)}
                  />
                  Practice · no rewards
                </label>
              </fieldset>
            )}
        </header>
        {daily.message && (
          <p role="alert" className="notice">
            {daily.message}
          </p>
        )}
        {daily.pending && (
          <div className="notice">
            <p>
              An earlier challenge request is unconfirmed. Retry it before
              choosing another.
            </p>
            <button disabled={daily.busy} onClick={daily.retry}>
              {daily.busy ? "Checking…" : "Retry original challenge request"}
            </button>
          </div>
        )}
        {(daily.conflict || session?.activeMatchId) && (
          <p className="notice">
            You have an active battle.{" "}
            <Link href={`/matches/${daily.conflict ?? session!.activeMatchId}`}>
              Resume active match
            </Link>
          </p>
        )}
        <ol className="daily-rail">
          {scenarios.map((s) => {
            const record = records?.find((d) => d.scenarioId === s.id),
              cooldown = record?.status === "COOLDOWN",
              active = record?.status === "ACTIVE";
            const open = isPractice ? s.canPractice : s.rewardOpen;
            const status = record?.status ?? (open ? "AVAILABLE" : "UPCOMING");
            const unavailable =
              !ready ||
              daily.busy ||
              !!daily.pending ||
              !!progress.error ||
              (!!session && !progress.data) ||
              !open ||
              cooldown ||
              (!isPractice && status === "COMPLETED");
            return (
              <li key={s.id} data-status={status}>
                <p className="kicker">
                  Day {s.dayIndex + 1} · {dateLabel(s.startsAt)}
                </p>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                <p className="daily-status">
                  {active
                    ? "Battle in progress"
                    : cooldown
                      ? `Retry in ${countdownLabel(record!.retryAvailableAt!, now)}`
                      : status === "COMPLETED"
                        ? "Completed · reward earned"
                        : status === "CLOSED"
                          ? "Closed for rewards"
                          : !open
                            ? "Not open yet"
                            : isPractice
                              ? "Practice · no account rewards"
                              : `Win: +${rewards.dailyWin} tickets`}
                </p>
                {active && record?.matchId ? (
                  <Link
                    className="campaign-button"
                    href={`/matches/${record.matchId}`}
                  >
                    Resume challenge
                  </Link>
                ) : (
                  <button
                    className="campaign-button"
                    disabled={unavailable}
                    onClick={() => void daily.start(s.id, slug, isPractice)}
                  >
                    {daily.busy
                      ? "Starting…"
                      : !isPractice && status === "COMPLETED"
                        ? "Completed"
                        : status === "CLOSED"
                          ? "Closed"
                          : cooldown
                            ? "Cooling down"
                            : !open
                              ? "Not open yet"
                              : isPractice
                                ? "Play practice"
                                : "Play daily challenge"}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>
      <section className="event-reward-rules">
        <h2>Earn the weekly card.</h2>
        <ul>
          <li>One rewarded win per day: {rewards.dailyWin} tickets.</li>
          <li>
            Complete three different days: +{rewards.threeDays}. Complete five:
            +{rewards.fiveDays}.
          </li>
          <li>
            All seven days: {rewards.firstCopy} tickets in total and a season
            completion badge.
          </li>
          <li>
            Normal PvE wins: {rewards.pveBase} tickets, +
            {rewards.pveSystemBonus} for each matching featured system. Maximum{" "}
            {rewards.pveDailyCap} PvE tickets per day.
          </li>
          <li>
            First copy at {rewards.firstCopy}; second at {rewards.secondCopy}.
            Tickets belong to this week. Earned cards remain yours.
          </li>
        </ul>
      </section>
      {progress.data && (
        <section className="reward-history">
          <h2>Reward history</h2>
          {progress.data.history.length ? (
            <ol>
              {progress.data.history.map((r) => (
                <li key={r.id}>
                  <strong>
                    {r.kind === "CARD"
                      ? `${r.cardId ? contentName(r.cardId) : "Card"} earned`
                      : r.kind === "COSMETIC"
                        ? "Season badge earned"
                        : `${r.kind === "PVE" ? "PvE win" : r.kind === "DAILY" ? "Daily win" : "Milestone"} · +${r.tickets} tickets`}
                  </strong>
                  <time dateTime={r.earnedAt}>{dateLabel(r.earnedAt)}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p>No account rewards earned this week yet.</p>
          )}
        </section>
      )}
    </article>
  );
}
function TicketProgress({
  progress,
  first,
  second,
}: {
  progress: WeeklyProgressView;
  first: number;
  second: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useUiMotion(ref, "panel", progress.ownedCopies, progress.ownedCopies > 0);
  return (
    <section
      className="ticket-progress"
      ref={ref}
      aria-label="Weekly ticket progress"
    >
      <div>
        <p className="kicker">Weekly tickets</p>
        <h2>
          {progress.tickets.toLocaleString("en-US")} <span>/ {second}</span>
        </h2>
        <progress
          value={Math.min(second, progress.tickets)}
          max={second}
          aria-label="Tickets toward the second card copy"
        />
        <p>
          {first} · First copy <span aria-hidden="true">/</span> {second} ·
          Second copy
        </p>
      </div>
      <div>
        <strong className="owned-reward">Owned {progress.ownedCopies}/2</strong>
        <p>
          {progress.completedDays.length}/7 daily wins · PvE today:{" "}
          {progress.pveEarnedToday}/{progress.pveCap}
        </p>
        {progress.cosmeticUnlocked && (
          <p>First Light Pathfinder badge earned</p>
        )}
      </div>
    </section>
  );
}
