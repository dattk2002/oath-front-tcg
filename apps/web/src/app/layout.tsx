import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/shell.css";
import "../styles/match.css";
import "../styles/deck.css";
import "../styles/assets.css";
export const metadata: Metadata = {
  title: "OathFront · Ngũ Lộ",
  description:
    "Trò chơi thẻ bài chiến thuật năm lộ, chơi với bot bằng tiếng Việt.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
