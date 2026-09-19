import type { IssueLocation } from "@/schemas/issue";
export const sampleCenter: IssueLocation = {
  lat: 37.3933,
  lng: -122.081,
  address: "Mountain View, CA",
};
export function distanceMeters(a: IssueLocation, b: IssueLocation) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad,
    dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function distanceLabel(value: number) {
  return value < 1000
    ? `${Math.round(value / 10) * 10} m`
    : `${(value / 1000).toFixed(1)} km`;
}
