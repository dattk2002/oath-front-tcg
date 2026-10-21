import App from "../App";
export const metadata = { title: "News · OathFront" };
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
        kind: "news",
        ...(query.category ? { filter: query.category } : {}),
      }}
    />
  );
}
