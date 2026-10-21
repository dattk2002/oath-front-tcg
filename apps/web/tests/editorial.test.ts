import { describe, expect, it } from "vitest";
import {
  editorialEntries,
  findEditorial,
  filterEditorial,
} from "../src/features/campaign/editorial";

describe("static editorial browsing", () => {
  it("filters by an actual category without inventing announcements or archived events", () => {
    expect(
      filterEditorial("news", "game-updates").map((item) => item.slug),
    ).toEqual(["readability-comes-first"]);
    expect(
      filterEditorial("events", "playtests").map((item) => item.slug),
    ).toEqual(["first-oath-play-session"]);
    expect(filterEditorial("news", "announcements")).toEqual([]);
    expect(filterEditorial("events", "archive")).toEqual([]);
  });
  it("resolves every item within its own section, rejects unknown paths and keeps mock labels", () => {
    for (const entry of editorialEntries) {
      expect(findEditorial(entry.section, entry.slug)).toMatchObject({
        title: entry.title,
        mock: true,
      });
      expect(entry.paragraphs.length).toBeGreaterThan(0);
    }
    expect(findEditorial("news", "first-oath-play-session")).toBeUndefined();
    expect(findEditorial("events", "unknown")).toBeUndefined();
  });
  it("falls back to all entries for an unsupported URL filter", () => {
    expect(filterEditorial("news", "unknown")).toHaveLength(6);
    expect(filterEditorial("events", "unknown")).toHaveLength(6);
  });
});
