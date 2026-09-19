import type { IssueLocation } from "@/schemas/issue";

function geolocation() {
  if (!window.isSecureContext)
    throw new Error(
      "Location needs HTTPS on your phone. Open the secure preview and try again.",
    );
  if (!navigator.geolocation)
    throw new Error("This browser does not support location.");
  return navigator.geolocation;
}
export class LocationError extends Error {
  constructor(public readonly code: number, message: string) { super(message); }
}
function locationError(error: Pick<GeolocationPositionError, "code">) {
  return new LocationError(error.code,
    error.code === 1
      ? "Location access is blocked. Enable Location Services for your browser and allow this website in Settings, then retry."
      : error.code === 3
        ? "Your browser did not return a location. Check its location permission and try again."
        : "Your device could not find its location. Check Location Services and try again.",
  );
}
function coordinates(position: GeolocationPosition): IssueLocation {
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}
const options: PositionOptions = {
  timeout: 30000,
  maximumAge: 10000,
  enableHighAccuracy: true,
};
export function currentLocation(): Promise<IssueLocation> {
  return new Promise((resolve, reject) => {
    const geo = geolocation();
    let finished = false;
    // Native timeouts may not cover permission acquisition. Always unlock the
    // UI even if WebKit supplies neither a success nor an error callback.
    const deadline = setTimeout(() => fail({ code: 3 }), 18000);
    function fail(error: Pick<GeolocationPositionError, "code">) {
      if (finished) return;
      finished = true; clearTimeout(deadline); reject(locationError(error));
    }
    function success(position: GeolocationPosition) {
      if (finished) return;
      finished = true; clearTimeout(deadline); resolve(coordinates(position));
    }
    // Request synchronously inside the user's tap. A fast network-assisted fix
    // is sufficient to center the map; watchLocation refines it with GPS.
    geo.getCurrentPosition(success, (error) => {
      if (finished) return;
      if (error.code === 1) fail(error);
      else geo.getCurrentPosition(success, fail, { ...options, timeout: 10000 });
    }, { enableHighAccuracy: false, maximumAge: 10000, timeout: 8000 });
    // A remembered denial need not show a new prompt; surface it immediately.
    navigator.permissions?.query({ name: "geolocation" }).then((permission) => {
      if (permission.state === "denied") fail({ code: 1 });
    }).catch(() => {});
  });
}
// A watcher is started only after a user requests location. Cleanup also ignores
// late callbacks, so a backgrounded/unmounted screen cannot receive stale fixes.
export function watchLocation(
  onChange: (point: IssueLocation) => void,
  onError: (error: Error) => void,
) {
  const geo = geolocation();
  let active = true;
  const id = geo.watchPosition(
    (position) => {
      if (active) onChange(coordinates(position));
    },
    (error) => {
      if (active) onError(locationError(error));
    },
    options,
  );
  return () => {
    active = false;
    geo.clearWatch(id);
  };
}
