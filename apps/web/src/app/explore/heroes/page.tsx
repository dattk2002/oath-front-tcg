import App from "../../App";
import { heroFilter } from "../../../features/campaign/model";
export const metadata = { title: "Heroes · OathFront" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ faction?: string }>;
}) {
  const query = await searchParams;
  return (
    <App
      screen="campaign"
      campaign={{ kind: "heroes", faction: heroFilter(query.faction) }}
    />
  );
}
