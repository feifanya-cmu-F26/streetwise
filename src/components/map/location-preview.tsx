"use client";
import Image from "next/image";
import { useState } from "react";
import { MapPin } from "lucide-react";
import type { IssueLocation } from "@/schemas/issue";

export function LocationPreview({
  location,
  label,
}: {
  location: IssueLocation;
  label: string;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const lng = location.lng.toFixed(6),
    lat = location.lat.toFixed(6);
  const url = token
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+205343(${lng},${lat})/${lng},${lat},15/600x240@2x?access_token=${encodeURIComponent(token)}`
    : "";
  return (
    <figure className="location-preview">
      {url && failedUrl !== url ? (
        <Image
          src={url}
          alt={`Issue location at ${lat}, ${lng}`}
          width={600}
          height={240}
          unoptimized
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <div className="location-preview-unavailable">
          <MapPin size={24} />
          <span>Map preview unavailable</span>
          {url && (
            <button
              type="button"
              className="text-button"
              onClick={() => setFailedUrl(null)}
            >
              Retry
            </button>
          )}
        </div>
      )}
      <figcaption>
        <MapPin size={15} />
        <span>{label}</span>
      </figcaption>
    </figure>
  );
}
