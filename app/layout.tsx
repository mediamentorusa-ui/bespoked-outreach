import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bespoked Outreach",
  description: "AI-assisted prospecting dashboard for Bespoked Hospitality"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
