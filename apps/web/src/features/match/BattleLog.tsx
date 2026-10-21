import type { MatchSnapshot } from "./view-store";
import { eventLabel } from "./labels";
export default function BattleLog({
  snapshot,
  compact = false,
}: {
  snapshot: MatchSnapshot;
  compact?: boolean;
}) {
  const content = (
    <>
      <h2>Battle log</h2>
      {snapshot.logExpired && <p role="status">Part of the log has expired.</p>}
      <ol aria-label="Match events">
        {snapshot.events.map((event) => (
          <li key={event.eventId} data-event-id={event.eventId}>
            {event.sequence} · {eventLabel[event.kind] ?? "Board updated"}
          </li>
        ))}
      </ol>
    </>
  );
  return compact ? (
    <details className="tablet-inspect">
      <summary>Log and controls</summary>
      <p>
        Select a card, then a target. Use Tab, arrow keys, Enter and Esc;
        dragging uses the same action.
      </p>
      {content}
    </details>
  ) : (
    <section className="battle-log panel">{content}</section>
  );
}
