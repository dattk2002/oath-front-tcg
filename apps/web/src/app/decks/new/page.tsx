import App from "../../App";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ hero?: string; preset?: string }>;
}) {
  const { hero, preset } = await searchParams;
  return (
    <App
      screen="builder"
      {...(hero ? { heroId: hero } : {})}
      {...(preset ? { presetId: preset } : {})}
    />
  );
}
