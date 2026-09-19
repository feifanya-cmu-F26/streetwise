import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streetwise · Neighborhood issues",
  description:
    "A civic reporting collaboration demo. Discover, review, and track neighborhood issues.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:block focus:p-3"
        >
          Skip to content
        </a>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight"
          >
            <MapPin size={23} aria-hidden="true" />
            Streetwise
          </Link>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
            Demo · fictional issues
          </span>
        </header>
        {children}
        <footer className="border-t border-border px-5 py-4 text-xs text-muted-foreground sm:px-8">
          Local demo. Changes may reset. No government reports are sent.
        </footer>
      </body>
    </html>
  );
}
