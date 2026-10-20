import App from "../../../App";
export default async function Page({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  return <App screen="builder" deckId={deckId} />;
}
