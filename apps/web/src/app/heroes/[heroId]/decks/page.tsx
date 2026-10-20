import App from "../../../App";
export default async function Page({
  params,
}: {
  params: Promise<{ heroId: string }>;
}) {
  const { heroId } = await params;
  return <App screen="decks" heroId={heroId} />;
}
