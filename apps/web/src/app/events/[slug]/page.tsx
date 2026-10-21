import { notFound } from "next/navigation";
import App from "../../App";
import {
  findEditorial,
  editorialEntries,
} from "../../../features/campaign/editorial";
export function generateStaticParams() {
  return editorialEntries
    .filter((entry) => entry.section === "events")
    .map((entry) => ({ slug: entry.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = findEditorial("events", slug);
  return {
    title: `${entry?.title ?? "Not found"} · OathFront`,
    description: entry?.summary,
  };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { slug } = await params;
  if (!findEditorial("events", slug)) notFound();
  const query = await searchParams;
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
