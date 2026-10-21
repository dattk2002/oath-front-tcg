import App from "../App";
export const metadata = { title: "Events · OathFront" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const query = await searchParams;
  return (
    <App
      screen="campaign"
      campaign={{
        kind: "events",
        ...(query.category ? { filter: query.category } : {}),
      }}
    />
  );
}
