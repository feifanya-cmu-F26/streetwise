"use client";
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import type { MapProps } from "./pins";
const Canvas = dynamic(() => import("./mapbox-canvas"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});
export function IssueMap(props: MapProps) {
  return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? (
    <MapBoundary>
      <Canvas {...props} />
    </MapBoundary>
  ) : (
    <div className="map-load-error">
      Map unavailable. You can still browse the issue list.
    </div>
  );
}
class MapBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="map-load-error" role="alert">
        Map could not start. The issue list remains available.
      </div>
    ) : (
      this.props.children
    );
  }
}
