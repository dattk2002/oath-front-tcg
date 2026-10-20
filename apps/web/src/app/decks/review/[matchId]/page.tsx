import App from "../../../App";
export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <App screen="review" reviewMatchId={matchId} />;
}
