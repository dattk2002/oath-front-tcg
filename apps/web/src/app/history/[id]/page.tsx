import { notFound } from "next/navigation";
import { validateWire } from "@oathfront/contracts";
import App from "../../App";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!validateWire("Uuid", id)) notFound();
  return <App screen="result" matchId={id} />;
}
