import { notFound } from "next/navigation";
import App from "../../App";
import { readNewsPost } from "../../../server/live-content";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const result = await readNewsPost((await params).slug);
  return {
    title: `${result.status === "ok" ? result.data.title : "News"} · OathFront`,
    ...(result.status === "ok" ? { description: result.data.summary } : {}),
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
  if ((await readNewsPost(slug)).status === "missing") notFound();
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
