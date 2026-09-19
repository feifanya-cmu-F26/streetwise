"use client";

import { useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { Issue } from "@/schemas/issue";

export default function MapboxCanvas({
  issues,
  selectedId,
  onSelect,
  token,
}: {
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  token: string;
}) {
  const [error, setError] = useState(false);
  return (
    <>
      <Map
        mapboxAccessToken={token}
        initialViewState={{ longitude: -122.081, latitude: 37.394, zoom: 14 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        onError={() => setError(true)}
      >
        <NavigationControl position="top-left" />
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            longitude={issue.location.lng}
            latitude={issue.location.lat}
          >
            <button
              aria-label={`View ${issue.report.title}`}
              aria-pressed={selectedId === issue.id}
              onClick={() => onSelect(issue.id)}
              className={`flex size-11 items-center justify-center rounded-full border-2 border-white shadow-md ${selectedId === issue.id ? "bg-primary text-white" : "bg-white text-primary"}`}
            >
              <span className="size-3 rounded-full bg-current" />
            </button>
          </Marker>
        ))}
      </Map>
      {error && (
        <p
          role="alert"
          className="absolute inset-x-4 bottom-12 rounded-lg bg-white p-3 text-sm shadow"
        >
          The map could not load. Use the issue list to continue.
        </p>
      )}
    </>
  );
}
