"use client";
import Image from "next/image";
import { useState, useRef, type ChangeEvent } from "react";
import { Camera, ImagePlus, MapPin, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/prototype/common";
import { useLocation } from "@/components/prototype/location-provider";
import { LocationPreview } from "@/components/map/location-preview";
import { readPhoto } from "@/lib/client/photo";
import { locatePhoto } from "@/lib/client/photo-location";
import { useLive, SignIn, request } from "@/components/live/provider";
import type { UploadResponse } from "@/schemas/upload";
import type { IssueLocation } from "@/schemas/issue";
export function ReportFlow() {
  const { user } = useLive(),
    gps = useLocation(),
    router = useRouter();
  const [photo, setPhoto] = useState(""),
    [description, setDescription] = useState(""),
    [location, setLocation] = useState<IssueLocation | null>(null),
    [locationSource, setLocationSource] = useState<"photo" | "current">("current"),
    [reading, setReading] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const upload = useRef<{ id: string; path: string } | null>(null);
  const selection = useRef(0);
  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const version = ++selection.current;
    setReading(true);
    setPhoto("");
    setLocation(null);
    upload.current = null;
    setError("");
    gps.dismissError();
    try {
      const photo = await readPhoto(file);
      if (selection.current !== version) return;
      setPhoto(photo);
      const result = await locatePhoto(file, gps.request);
      if (selection.current !== version) return;
      setLocation(result.location);
      setLocationSource(result.source);
    } catch (e) {
      if (selection.current === version) setError((e as Error).message);
    } finally {
      if (selection.current === version) setReading(false);
    }
  }
  async function submit() {
    if (!photo || !location) return;
    setBusy(true);
    setError("");
    try {
      if (!upload.current) {
        const blob = await (await fetch(photo)).blob();
        const slot = await request<UploadResponse>("/api/issues/upload", {
          contentType: "image/jpeg",
          sizeBytes: blob.size,
        });
        const response = await fetch(slot.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (!response.ok) throw new Error("Photo upload failed. Try again.");
        upload.current = { id: crypto.randomUUID(), path: slot.storagePath };
      }
      const draft = upload.current;
      await request("/api/reports", {
        id: draft.id,
        storagePath: draft.path,
        location,
        description,
      });
      router.push(`/submissions/${draft.id}`);
      setPhoto("");
      setDescription("");
      upload.current = null;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="content-page">
      <PageHeader title="New issue" />
      {!user ? (
        <SignIn />
      ) : (
        <div className="page-body report-editor">
          {photo ? (
            <Image
              className="report-photo"
              src={photo}
              width={900}
              height={675}
              alt="Your issue photo"
              unoptimized
            />
          ) : (
            <div className="photo-empty">
              <Camera size={48} />
              <h2>See something that needs fixing?</h2>
              <p>Start with a photo.</p>
            </div>
          )}
          <div className="action-row">
            <label className="secondary-button file-button">
              <Camera size={19} />
              Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={pick}
                disabled={busy || reading}
              />
            </label>
            <label className="secondary-button file-button">
              <ImagePlus size={19} />
              Photo library
              <input
                type="file"
                accept="image/*"
                onChange={pick}
                disabled={busy || reading}
              />
            </label>
          </div>
          <label className="field-label">
            Description <span className="muted">(optional)</span>
            <textarea
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything else we should know?"
              rows={3}
            />
          </label>
          <section className="section-block">
            <h3>
              <MapPin size={18} />
              Issue location
            </h3>
            {reading && <p role="status">Reading photo location…</p>}
            {location && <p className="small muted">{locationSource === "photo" ? "Photo location" : "Current location"}</p>}
            {location && (
              <LocationPreview
                location={location}
                label={
                  location.address ||
                  `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                }
              />
            )}
            <button
              className="text-button"
              disabled={gps.locating || reading || busy}
              onClick={async () => {
                const point = await gps.request();
                if (point) { setLocation(point); setLocationSource("current"); }
              }}
            >
              {gps.locating ? "Finding location…" : "Use current location"}
            </button>
            {gps.error && <p role="alert">{gps.error}</p>}
          </section>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button full-width"
            disabled={!photo || !location || busy || reading}
            onClick={submit}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={18} />
                Saving report…
              </>
            ) : (
              "Continue"
            )}
          </button>
        </div>
      )}
    </main>
  );
}
