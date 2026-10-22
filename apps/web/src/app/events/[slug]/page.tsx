import { notFound } from "next/navigation";
import App from "../../App";
import { readWeeklyEvent } from "../../../server/live-content";
import { legacyEventSlugs } from "../../../features/events/model";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (legacyEventSlugs.has(slug))
    return { title: "Archived event concept · OathFront" };
  const result = await readWeeklyEvent(slug);
  return {
    title: `${result.status === "ok" ? result.data.event.title : "Weekly event"} · OathFront`,
  };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { slug } = await params,
    query = await searchParams;
  if (
    !legacyEventSlugs.has(slug) &&
    (await readWeeklyEvent(slug)).status === "missing"
  )
    notFound();
  return (
    <App
      screen="campaign"
      campaign={{
        kind: "events",
        slug,
        ...(query.category ? { filter: query.category } : {}),
      }}
    />
  );
}
