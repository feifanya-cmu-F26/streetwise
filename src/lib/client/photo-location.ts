import type { IssueLocation } from "@/schemas/issue";

export async function readPhotoLocation(file: File): Promise<IssueLocation | null> {
  if (file.size > 15 * 1024 * 1024) return null;
  try {
    // Only parse the original local bytes. Canvas compression removes EXIF.
    const { gps } = await import("exifr");
    const coordinates = await gps(await file.arrayBuffer());
    const lat = coordinates?.latitude, lng = coordinates?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number" ||
        !Number.isFinite(lat) || !Number.isFinite(lng) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  } catch {
    // Missing, stripped or malformed EXIF does not make a photo unusable.
    return null;
  }
}

export async function locatePhoto(
  file: File,
  current: () => Promise<IssueLocation | null>,
) {
  const embedded = await readPhotoLocation(file);
  if (embedded) return { location: embedded, source: "photo" as const };
  return { location: await current(), source: "current" as const };
}
