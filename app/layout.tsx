import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YT to Transcript",
  description: "Get the transcript of any YouTube video",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
