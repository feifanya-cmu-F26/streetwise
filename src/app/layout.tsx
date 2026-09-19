import type { Metadata, Viewport } from "next";
import { LiveProvider } from "@/components/live/provider";
import { LocationProvider } from "@/components/prototype/location-provider";
import { BottomNavigation } from "@/components/prototype/navigation";
import "./globals.css";
import { AppShell } from "@/components/prototype/app-shell";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafff7",
};
export const metadata: Metadata = {
  title: "Streetwise · A better neighborhood starts here",
  description:
    "Discover, report, and follow neighborhood issues. Civic reporting with transparent progress.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <LiveProvider>
          <LocationProvider>
            <AppShell>{children}</AppShell>
            <BottomNavigation />
          </LocationProvider>
        </LiveProvider>
      </body>
    </html>
  );
}
