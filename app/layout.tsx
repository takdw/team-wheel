import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Team Wheel — A turn for everyone",
  description:
    "One shared wheel for your team. Random and balanced picks, transparent odds, and a history of every turn.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
