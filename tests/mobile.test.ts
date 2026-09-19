import assert from "node:assert/strict";
import test from "node:test";
import { localId } from "../src/lib/client/id";
import { currentLocation, watchLocation } from "../src/lib/client/location";
import { createSubmission } from "../src/lib/demo/workflow";
import { sampleCenter } from "../src/lib/geo/distance";
import { prototypeSubmissionSchema } from "../src/schemas/prototype";

test("LAN HTTP creates valid demo UUIDs when secure randomUUID is unavailable", () => {
  const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  try {
    Object.defineProperty(crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    });
    const ids = new Set(Array.from({ length: 100 }, () => localId()));
    assert.equal(ids.size, 100);
    for (const id of ids)
      assert.match(
        id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    assert.equal(
      prototypeSubmissionSchema.parse(
        createSubmission("/images/pothole.png", "LAN test", sampleCenter),
      ).mode,
      "demo",
    );
  } finally {
    if (original) Object.defineProperty(crypto, "randomUUID", original);
    else Reflect.deleteProperty(crypto, "randomUUID");
  }
});
test("HTTP location fails clearly before requesting permission", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Object.defineProperty(globalThis, "window", {
      value: { isSecureContext: false },
      configurable: true,
    });
    await assert.rejects(
      currentLocation(),
      /Location needs HTTPS on your phone/,
    );
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("location watch delivers movement and stops after cleanup", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let receive: PositionCallback = () => {};
  let cleared = -1;
  const received: { lat: number; lng: number }[] = [];
  try {
    Object.defineProperty(globalThis, "window", {
      value: { isSecureContext: true },
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          watchPosition(success: PositionCallback) {
            receive = success;
            return 42;
          },
          clearWatch(id: number) {
            cleared = id;
          },
        },
      },
      configurable: true,
    });
    const stop = watchLocation(
      (point) => received.push(point),
      () => assert.fail("unexpected error"),
    );
    const fix = (latitude: number, longitude: number) =>
      ({ coords: { latitude, longitude } }) as GeolocationPosition;
    receive(fix(37.3933, -122.081));
    receive(fix(37.3943, -122.08));
    assert.deepEqual(received, [
      { lat: 37.3933, lng: -122.081 },
      { lat: 37.3943, lng: -122.08 },
    ]);
    stop();
    assert.equal(cleared, 42);
    receive(fix(37.3953, -122.079));
    assert.equal(
      received.length,
      2,
      "late fixes must not update an inactive watch",
    );
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldNavigator)
      Object.defineProperty(globalThis, "navigator", oldNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test('location request uses a fast initial fix before precise watching', async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'window', { value: { isSecureContext: true }, configurable: true });
    Object.defineProperty(globalThis, 'navigator', { value: { geolocation: {
      getCurrentPosition(success: PositionCallback, _error: PositionErrorCallback, options: PositionOptions) {
        assert.equal(options.enableHighAccuracy, false);
        success({ coords: { latitude: 37.41, longitude: -122.07 } } as GeolocationPosition);
      },
    } }, configurable: true });
    assert.deepEqual(await currentLocation(), { lat: 37.41, lng: -122.07 });
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

test('missing browser callbacks cannot leave the location button pending forever', async (t) => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    Object.defineProperty(globalThis, 'window', { value: { isSecureContext: true }, configurable: true });
    Object.defineProperty(globalThis, 'navigator', { value: { geolocation: { getCurrentPosition() {} } }, configurable: true });
    const request = currentLocation();
    const rejection = assert.rejects(request, /browser did not return a location/);
    t.mock.timers.tick(18000);
    await rejection;
  } finally {
    t.mock.timers.reset();
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

test('remembered permission denial is surfaced even without a native callback', async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'window', { value: { isSecureContext: true }, configurable: true });
    Object.defineProperty(globalThis, 'navigator', { value: {
      geolocation: { getCurrentPosition() {} },
      permissions: { query: async () => ({ state: 'denied' }) },
    }, configurable: true });
    await assert.rejects(currentLocation(), /Location access is blocked/);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
