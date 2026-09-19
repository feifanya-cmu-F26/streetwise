import test from "node:test";
import assert from "node:assert/strict";
import { locatePhoto, readPhotoLocation } from "../src/lib/client/photo-location";

// Minimal JPEG APP1/TIFF fixture with real GPS rationals, independent of parser.
function geotaggedPhoto(latRef = "N", lngRef = "W", degrees = 37) {
  const tiff = Buffer.alloc(128);
  tiff.write("II", 0); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x8825, 10); tiff.writeUInt16LE(4, 12);
  tiff.writeUInt32LE(1, 14); tiff.writeUInt32LE(26, 18);
  tiff.writeUInt16LE(4, 26);
  for (let i = 0; i < 4; i++) {
    const pos = 28 + i * 12, reference = i % 2 === 0;
    tiff.writeUInt16LE(i + 1, pos); tiff.writeUInt16LE(reference ? 2 : 5, pos + 2);
    tiff.writeUInt32LE(reference ? 2 : 3, pos + 4);
    if (reference) tiff.write(i === 0 ? latRef : lngRef, pos + 8);
    else tiff.writeUInt32LE(i === 1 ? 80 : 104, pos + 8);
  }
  for (const [offset, values] of [[80, [degrees, 24, 0]], [104, [122, 6, 0]]] as const) {
    values.forEach((value, i) => { tiff.writeUInt32LE(value, offset + i * 8); tiff.writeUInt32LE(1, offset + i * 8 + 4); });
  }
  const app = Buffer.concat([Buffer.from("Exif\0\0"), tiff]);
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 0]);
  header.writeUInt16BE(app.length + 2, 4);
  return new File([header, app, Buffer.from([0xff, 0xd9])], "gps.jpg", { type: "image/jpeg" });
}

test("real EXIF GPS wins without asking for current location", async () => {
  const result = await locatePhoto(geotaggedPhoto(), async () => { throw new Error("GPS must not be requested"); });
  assert.deepEqual(result, { location: { lat: 37.4, lng: -122.1 }, source: "photo" });
  assert.deepEqual(await readPhotoLocation(geotaggedPhoto("S", "E")), { lat: -37.4, lng: 122.1 });
});

test("missing, corrupt and out-of-range GPS fall back to a fresh device fix", async () => {
  for (const file of [new File(["not EXIF"], "image.png"), geotaggedPhoto("N", "W", 95)]) {
    let calls = 0;
    const result = await locatePhoto(file, async () => { calls++; return { lat: 10, lng: 20 }; });
    assert.equal(calls, 1);
    assert.deepEqual(result, { location: { lat: 10, lng: 20 }, source: "current" });
  }
  const denied = await locatePhoto(new File([], "empty.jpg"), async () => null);
  assert.equal(denied.location, null, "a failed fallback cannot reuse the previous photo location");
});
