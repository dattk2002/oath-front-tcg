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
      <h2>Nhật ký</h2>
      {snapshot.logExpired && <p role="status">Một phần nhật ký đã hết hạn.</p>}
      <ol aria-label="Diễn biến trận">
        {snapshot.events.map((event) => (
          <li key={event.eventId} data-event-id={event.eventId}>
            {event.sequence} · {eventLabel[event.kind] ?? "Cập nhật bàn chơi"}
          </li>
        ))}
      </ol>
    </>
  );
  return compact ? (
    <details className="tablet-inspect">
      <summary>Nhật ký và cách thao tác</summary>
      <p>
        Chọn bài rồi chọn mục tiêu. Tab, phím mũi tên, Enter và Esc; kéo bài
        dùng cùng hành động.
      </p>
      {content}
    </details>
  ) : (
    <section className="battle-log panel">{content}</section>
  );
}
