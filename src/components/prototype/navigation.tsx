"use client";
import { usePathname } from "next/navigation";
import { Camera, FileText, Map } from "lucide-react";
import { navigateTab } from "@/lib/client/navigation";
export function BottomNavigation() {
  const path = usePathname();
  return (
    <nav className="bottom-navigation" aria-label="Main navigation">
      {[
        {
          href: "/",
          label: "Map",
          Icon: Map,
          active: path === "/" || path.startsWith("/issues"),
        },
        {
          href: "/report",
          label: "Report",
          Icon: Camera,
          active: path === "/report",
        },
        {
          href: "/submissions",
          label: "My submissions",
          Icon: FileText,
          active: path.startsWith("/submissions"),
        },
      ].map(({ href, label, Icon, active }) => (
        <a
          key={href}
          href={href}
          aria-label={href === "/report" ? "Report a new issue" : label}
          aria-current={active ? "page" : undefined}
          className={`${active ? "active " : ""}${href === "/report" ? "camera-navigation" : ""}`}
          onClick={(e) => {
            if (
              e.button !== 0 ||
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey
            )
              return;
            e.preventDefault();
            navigateTab(href);
          }}
        >
          <span className={href === "/report" ? "camera-circle" : "nav-icon"}>
            <Icon size={href === "/report" ? 26 : 24} strokeWidth={1.9} />
          </span>
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
