import { validateBrowserWire } from "@oathfront/contracts/browser";
import type {
  DailyCreateRequest,
  NewsCategory,
} from "@oathfront/contracts/browser";
export const pendingDailyKey = "oathfront.daily-create";
export type DailyIntent = { request: DailyCreateRequest; eventSlug: string };
export function readDailyIntent(
  storage: Pick<Storage, "getItem"> | null,
): DailyIntent | null {
  try {
    const value: unknown = JSON.parse(
      storage?.getItem(pendingDailyKey) ?? "null",
    );
    if (
      value &&
      typeof value === "object" &&
      "request" in value &&
      "eventSlug" in value &&
      typeof value.eventSlug === "string" &&
      /^[a-z0-9-]+$/.test(value.eventSlug) &&
      validateBrowserWire("DailyCreateRequest", value.request)
    )
      return { request: value.request, eventSlug: value.eventSlug };
  } catch {
    /* An unavailable device store must not prevent an in-memory retry. */
  }
  return null;
}
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
export function countdownLabel(until: string, serverNow: number) {
  const minutes = Math.max(
    0,
    Math.ceil((Date.parse(until) - serverNow) / 60000),
  );
  return minutes === 0
    ? "Ready"
    : minutes >= 1440
      ? `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
      : minutes >= 60 && minutes % 60 === 0
        ? `${minutes / 60}h`
        : `${minutes}m`;
}
export const eventCategory = (value?: string) =>
  value === "active"
    ? "ACTIVE"
    : value === "upcoming"
      ? "UPCOMING"
      : value === "archive"
        ? "ENDED"
        : "ALL";
export const newsCategory = (value?: string): NewsCategory | undefined =>
  (
    ({
      news: "NEWS",
      updates: "UPDATE",
      guides: "GUIDE",
      events: "EVENT",
      announcements: "NEWS",
      "game-updates": "UPDATE",
      "dev-diaries": "GUIDE",
    }) as Record<string, NewsCategory>
  )[value ?? ""];
export const legacyEventSlugs = new Set([
  "the-fivefold-sketchbook",
  "first-oath-play-session",
  "design-your-deck",
  "meet-the-makers",
  "faction-focus",
  "your-oath-your-story",
]);
