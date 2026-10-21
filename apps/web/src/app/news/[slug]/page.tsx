import { notFound } from "next/navigation";
import App from "../../App";
import {
  findEditorial,
  editorialEntries,
} from "../../../features/campaign/editorial";
export function generateStaticParams() {
  return editorialEntries
    .filter((entry) => entry.section === "news")
    .map((entry) => ({ slug: entry.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = findEditorial("news", slug);
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
  if (!findEditorial("news", slug)) notFound();
  const query = await searchParams;
  return (
    <App
      screen="campaign"
      campaign={{
        kind: "news",
        slug,
        ...(query.category ? { filter: query.category } : {}),
      }}
    />
  );
}
