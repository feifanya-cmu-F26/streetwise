"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MapExperience } from "@/components/map/map-experience";
import { ReportFlow } from "@/components/report/report-flow";
import { SubmissionsPage } from "@/components/report/submissions-page";
import { useLive } from "@/components/live/provider";
const tabs = ["/", "/report", "/submissions"];
// Native history is integrated with Next's usePathname. These three local screens
// stay mounted; switching tabs doesn't fetch an RSC page or recreate the map.

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useLive();
  return (
    <div id="main" className="app-shell">
      <div className="app-screen" hidden={pathname !== "/"}>
        <MapExperience active={pathname === "/"} />
      </div>
      <div className="app-screen" hidden={pathname !== "/report"}>
        <ReportFlow key={user?.id || "anonymous"} />
      </div>
      <div className="app-screen" hidden={pathname !== "/submissions"}>
        <SubmissionsPage key={user?.id || "anonymous"} />
      </div>
      {!tabs.includes(pathname) && children}
    </div>
  );
}
