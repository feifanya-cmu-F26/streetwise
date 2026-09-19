"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Issue } from "@/schemas/issue";

const MapboxCanvas = dynamic(() => import("./mapbox-canvas"), {
  ssr: false,
  loading: () => (
    <p className="p-8" role="status">
      Loading map…
    </p>
  ),
});

export function IssueMap(props: {
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  return (
    <section
      aria-label="Neighborhood map"
      className="relative min-h-72 overflow-hidden rounded-xl border border-border bg-[#edf1ea] lg:min-h-[580px]"
    >
      {token ? (
        <MapboxCanvas {...props} token={token} />
      ) : (
        <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 py-16 text-center lg:min-h-[580px]">
          <MapPin
            size={36}
            strokeWidth={1.4}
            className="mb-5 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold">Map not connected</h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Explore the sample issues in the list. A connected map will show
            their locations here.
          </p>
          <span className="mt-8 text-xs tracking-wide text-muted-foreground">
            MOUNTAIN VIEW, CALIFORNIA
          </span>
        </div>
      )}
    </section>
  );
}
