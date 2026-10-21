import data from "./editorial-data.json";
export type EditorialSection = "news" | "events";
export type EditorialEntry = Omit<(typeof data)[number], "section"> & {
  section: EditorialSection;
};
export const editorialEntries: readonly EditorialEntry[] = data.map((entry) => {
  if (entry.section !== "news" && entry.section !== "events")
    throw new Error("Unsupported editorial section");
  return { ...entry, section: entry.section };
});
export const editorialFilters = {
  news: [
    { id: "latest", label: "Latest" },
    { id: "announcements", label: "Announcements" },
    { id: "dev-diaries", label: "Dev diaries" },
    { id: "game-updates", label: "Game updates" },
  ],
  events: [
    { id: "all", label: "All events" },
    { id: "community", label: "Community" },
    { id: "playtests", label: "Playtests" },
    { id: "archive", label: "Archive" },
  ],
} as const;
export function editorialFilter(section: EditorialSection, value?: string) {
  return (
    editorialFilters[section].find((filter) => filter.id === value)?.id ??
    editorialFilters[section][0].id
  );
}
export function filterEditorial(section: EditorialSection, value?: string) {
  const filter = editorialFilter(section, value);
  return editorialEntries.filter(
    (entry) =>
      entry.section === section &&
      (filter === "all" || filter === "latest" || entry.filter === filter),
  );
}
export function findEditorial(section: EditorialSection, slug: string) {
  return editorialEntries.find(
    (entry) => entry.section === section && entry.slug === slug,
  );
}
