import App from "../App";
export const metadata = { title: "Game Features · OathFront" };
export default function Page() {
  return <App screen="campaign" campaign={{ kind: "features" }} />;
}
