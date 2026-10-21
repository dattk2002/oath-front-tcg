import { notFound } from "next/navigation";
import App from "../../../App";
import {
  heroFilter,
  publicHero,
  publicHeroes,
} from "../../../../features/campaign/model";
import { contentName } from "../../../../content/english-content";
export function generateStaticParams() {
  return publicHeroes.map((hero) => ({ heroId: hero.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ heroId: string }>;
}) {
  const { heroId } = await params;
  return { title: `${contentName(heroId)} · OathFront` };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ heroId: string }>;
  searchParams: Promise<{ faction?: string }>;
}) {
  const { heroId } = await params;
  const hero = publicHero(heroId);
  if (!hero) notFound();
  const query = await searchParams;
  return (
    <App
      screen="campaign"
      campaign={{
        kind: "hero",
        heroId: hero.id,
        faction: heroFilter(query.faction),
      }}
    />
  );
}
