import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "物々交換",
  description: "誰とでもいつでも物々交換できるサイト",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
