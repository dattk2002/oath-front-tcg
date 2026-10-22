import { useRef } from "react";
import Link from "next/link";
import type { MatchSummary } from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";
import { useLiveRead } from "../content/use-live-read";
import { useUiMotion } from "../motion/use-ui-motion";
import { CampaignArtwork } from "../campaign/CampaignArtwork";
import { artById } from "../match/rendering/asset-manifest";
import { contentName } from "../../content/english-content";
export function RewardSummary({
  summary,
  api,
}: {
  summary: MatchSummary;
  api: ApiClient;
}) {
  const ref = useRef<HTMLElement>(null);
  const events = useLiveRead(
    `result-event:${summary.matchId}`,
    () => api.weeklyEvents(),
    !!summary.challenge || !!summary.rewards,
  );
  useUiMotion(ref, "panel", summary.matchId, !!summary.rewards?.cards.length);
  const id = summary.challenge?.eventId ?? summary.rewards?.eventId;
  const event = events.data?.items.find((e) => e.id === id);
  if (!summary.challenge && !summary.rewards) return null;
  return (
    <section className="result-rewards" ref={ref} aria-label="Event rewards">
      <h3>{summary.challenge ? "Daily expedition" : "Weekly progress"}</h3>
      {summary.rewards?.eligibility === "ELIGIBLE" ? (
        <p>+{summary.rewards.tickets} tickets earned.</p>
      ) : (
        <p>
          {summary.rewards?.eligibility === "PRACTICE"
            ? "Practice complete · no account rewards."
            : summary.rewards?.eligibility === "EXPIRED"
              ? "The reward completion window has closed."
              : "This match does not earn account rewards."}
        </p>
      )}
      {summary.rewards?.cards.map((card) => (
        <div key={card.cardId}>
          <CampaignArtwork
            className="contain"
            src={artById(card.cardId)!.inspect!}
            alt=""
          />
          <strong>
            {contentName(card.cardId)} · {card.quantity} copy earned
          </strong>
          <p>Saved to your collection.</p>
        </div>
      ))}
      {!!summary.rewards?.cosmetics.length && (
        <p>Season completion badge earned.</p>
      )}
      {summary.challenge && summary.outcome?.result === "LOSS" && (
        <p>
          Defeat or surrender starts a one-hour retry wait. Check the event for
          the exact countdown.
        </p>
      )}
      <Link href={event ? `/events/${event.slug}` : "/events"}>
        Return to weekly event
      </Link>
    </section>
  );
}
