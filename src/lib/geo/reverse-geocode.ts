import "server-only";
import { requiredServerEnv } from "@/lib/env";
import { locationSchema, type IssueLocation } from "@/schemas/issue";

const MAX_ADDRESS_LENGTH = locationSchema.shape.address.unwrap().maxLength ?? 300;
const TIMEOUT_MS = 4000;

// Server-only token, separate from the public one the browser map uses, so
// this quota is not spendable by anyone who opens the page.
export async function reverseGeocode(
  location: IssueLocation,
): Promise<string | null> {
  const token = requiredServerEnv("MAPBOX_ACCESS_TOKEN");
  const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
  url.searchParams.set("longitude", String(location.lng));
  url.searchParams.set("latitude", String(location.lat));
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", token);
  // An address is supplementary, so a slow or failing Mapbox degrades to no
  // address rather than failing the report the user is trying to file.
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const address = body?.features?.[0]?.properties?.full_address;
    if (typeof address !== "string" || address.length === 0) return null;
    return address.slice(0, MAX_ADDRESS_LENGTH);
  } catch {
    return null;
  }
}
