"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import Map, { Marker, Popup, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { IssuePin, PinPreview, type MapProps } from "./pins";
export default function MapboxCanvas(props: MapProps) {
  const ref = useRef<MapRef>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [supported] = useState(() => mapboxgl.supported());
  const selected = props.issues.find((i) => i.id === props.selectedId);
  useEffect(() => {
    ref.current?.flyTo({
      center: [props.origin.lng, props.origin.lat],
      zoom: 16.5,
      duration: 700,
    });
  }, [props.origin.lat, props.origin.lng, props.recenter]);
  useEffect(() => {
    if (!props.active) return;
    const frame = requestAnimationFrame(() => ref.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [props.active]);
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setError(true), 15000);
    return () => clearTimeout(timer);
  }, [loaded, attempt]);
  if (!supported)
    return (
      <div className="map-load-error" role="alert">
        This browser cannot display the interactive map. Nearby issues are
        available below.
      </div>
    );
  return (
    <>
      <Map
        key={attempt}
        onLoad={() => {
          setLoaded(true);
          setError(false);
        }}
        ref={ref}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          latitude: props.origin.lat,
          longitude: props.origin.lng,
          zoom: 16.5,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onError={() => setError(true)}
        onDragStart={() => props.onUserMove?.()}
        style={{ width: "100%", height: "100%" }}
      >
        {props.userLocation && (
          <Marker
            latitude={props.userLocation.lat}
            longitude={props.userLocation.lng}
          >
            <span
              className="user-location-dot"
              aria-label="Your current location"
            />
          </Marker>
        )}
        {props.issues.map((i) => (
          <Marker
            key={i.id}
            latitude={i.location.lat}
            longitude={i.location.lng}
            anchor="bottom"
          >
            <IssuePin
              issue={i}
              selected={props.selectedId === i.id}
              onSelect={() => props.onSelect(i.id)}
            />
          </Marker>
        ))}
        {selected && (
          <Popup
            latitude={selected.location.lat}
            longitude={selected.location.lng}
            anchor="bottom"
            offset={58}
            closeButton={false}
            focusAfterOpen={false}
            closeOnClick={false}
            onClose={props.onClose}
          >
            <PinPreview
              issue={selected}
              distance={props.selectedDistance}
              onClose={props.onClose}
            />
          </Popup>
        )}
      </Map>
      {error && (
        <div role="alert" className="map-load-error">
          <p>
            The map could not finish loading. Check your connection or retry.
            Nearby issues are still available below.
          </p>
          <button
            className="secondary-button compact"
            onClick={() => {
              setError(false);
              setLoaded(false);
              setAttempt((n) => n + 1);
            }}
          >
            Retry map
          </button>
        </div>
      )}
    </>
  );
}
