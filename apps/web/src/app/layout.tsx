import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/shell.css";
import "../styles/match.css";
import "../styles/deck.css";
import "../styles/assets.css";
export const metadata: Metadata = {
  title: "OathFront · The Fivefold",
  description:
    "A tactical five-lane card game. Choose your hero and challenge the bot in the Fivefold.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
