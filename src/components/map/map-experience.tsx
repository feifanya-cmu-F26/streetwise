"use client";
import { useRef, useState, type PointerEvent, type TouchEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Navigation, MapPin, Search, X, LoaderCircle } from "lucide-react";
import { issuePhoto } from "@/lib/demo/presentation";
import {
  distanceMeters,
  distanceLabel,
  sampleCenter,
} from "@/lib/geo/distance";
import { ReportedStatus } from "@/components/prototype/common";
import { IssueMap } from "./issue-map";
import { BrandMark } from "@/components/ui/streetwise-icons";
import { useLocation } from "@/components/prototype/location-provider";
import { useLive } from "@/components/live/provider";
type Snap = "collapsed" | "middle" | "expanded";
export function MapExperience({
  initialIssueId,
  active = true,
}: {
  initialIssueId?: string;
  active?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
      initialIssueId || null,
    ),
    [snap, setSnap] = useState<Snap>("middle"),
    [dragHeight, setDragHeight] = useState<number | null>(null);
  const [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [origin, setOrigin] = useState(sampleCenter),
    [message, setMessage] = useState(""),
    [recenter, setRecenter] = useState(0);
  const [following, setFollowing] = useState(false);
  const gps = useLocation();
  const { issues: displayIssues, error: loadError } = useLive();
  const locating = gps.locating,
    located = !!gps.point;
  const sheet = useRef<HTMLElement>(null),
    drag = useRef<{
      y: number;
      height: number;
      moved: boolean;
      currentHeight: number;
    } | null>(null);
  const issues = displayIssues
    .filter((i) =>
      `${i.report.title} ${i.location.address}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .map((issue) => ({
      issue,
      distance: distanceMeters(gps.point || origin, issue.location),
    }))
    .sort((a, b) => a.distance - b.distance);
  const selected = issues.find((i) => i.issue.id === selectedId);
  async function locate() {
    const point = await gps.request();
    if (point) {
      setOrigin(point);
      setFollowing(true);
      setRecenter((n) => n + 1);
    }
  }
  const heights = () => ({
    collapsed: 108,
    middle: Math.max(
      296,
      (window.visualViewport?.height || window.innerHeight) * 0.36,
    ),
    expanded: window.innerHeight - 180,
  });
  function dragStart(e: PointerEvent<HTMLElement>) {
    if (e.pointerType === "touch") return;
    drag.current = {
      y: e.clientY,
      height: sheet.current?.getBoundingClientRect().height || 270,
      moved: false,
      currentHeight: sheet.current?.getBoundingClientRect().height || 270,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function dragMove(e: PointerEvent<HTMLElement>) {
    if (e.pointerType === "touch") return;
    if (!drag.current) return;
    const delta = drag.current.y - e.clientY;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    drag.current.currentHeight = Math.max(
      108,
      Math.min(heights().expanded, drag.current.height + delta),
    );
    setDragHeight(drag.current.currentHeight);
  }
  function touchStart(e: TouchEvent<HTMLElement>) {
    if (e.touches.length !== 1) return;
    const height = sheet.current?.getBoundingClientRect().height || 270;
    drag.current = {
      y: e.touches[0].clientY,
      height,
      currentHeight: height,
      moved: false,
    };
  }
  function touchMove(e: TouchEvent<HTMLElement>) {
    if (!drag.current || e.touches.length !== 1) return;
    const delta = drag.current.y - e.touches[0].clientY;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    drag.current.currentHeight = Math.max(
      108,
      Math.min(heights().expanded, drag.current.height + delta),
    );
    setDragHeight(drag.current.currentHeight);
  }
  function finishDrag() {
    if (!drag.current) return;
    if (drag.current.moved) {
      const sizes = heights();
      const nearest = (Object.keys(sizes) as Snap[]).sort(
        (a, b) =>
          Math.abs(sizes[a] - (drag.current?.currentHeight || 270)) -
          Math.abs(sizes[b] - (drag.current?.currentHeight || 270)),
      )[0];
      setSnap(nearest);
      if (nearest === "expanded") setSelectedId(null);
    } else {
      setSnap(snap === "expanded" ? "middle" : "expanded");
      setSelectedId(null);
    }
    drag.current = null;
    setDragHeight(null);
  }
  return (
    <main className="map-home">
      <IssueMap
        active={active}
        userLocation={gps.point}
        issues={issues.map((i) => i.issue)}
        selectedId={selected?.issue.id || null}
        origin={following && gps.point ? gps.point : origin}
        onUserMove={() => setFollowing(false)}
        recenter={recenter}
        selectedDistance={selected ? distanceLabel(selected.distance) : ""}
        onSelect={(id) => {
          setSelectedId(id);
          if (snap === "expanded") setSnap("middle");
        }}
        onClose={() => {
          setSelectedId(null);
          setSnap("middle");
        }}
      />
      <header className="map-toolbar">
        <Link href="/" className="wordmark" aria-label="Streetwise home">
          <BrandMark size={24} />
          <span>Streetwise</span>
        </Link>
        <span className="toolbar-divider" />
        <button className="location-selector" onClick={locate}>
          <MapPin size={16} className="address-pin" aria-hidden="true" />
          <span>
            {located
              ? "Your location"
              : origin.lat === sampleCenter.lat &&
                  origin.lng === sampleCenter.lng
                ? "Mountain View"
                : "Map center"}
          </span>
        </button>
        <button
          className="icon-button"
          aria-label="Search issues"
          onClick={() => setSearchOpen((v) => !v)}
        >
          <Search size={21} />
        </button>
      </header>
      {searchOpen && (
        <div className="map-search">
          <Search size={19} />
          <input
            autoFocus
            aria-label="Search nearby issues"
            placeholder="Search nearby issues"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            aria-label="Clear and close search"
            onClick={() => {
              setQuery("");
              setSearchOpen(false);
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {(message || gps.error || loadError) && (
        <div className="map-message" role="status">
          <span>{message || gps.error || loadError}</span>
          <button
            aria-label="Dismiss location message"
            onClick={() => {
              setMessage("");
              gps.dismissError();
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <button
        className="recenter-button"
        aria-label="Use my current location"
        disabled={locating}
        onClick={locate}
        style={{ bottom: dragHeight ? dragHeight + 112 : undefined }}
      >
        {locating ? <LoaderCircle size={22} className="animate-spin" /> : <Navigation size={22} />}
      </button>
      <section
        ref={sheet}
        className={`nearby-sheet ${snap}`}
        aria-label="Nearby issues"
        style={
          dragHeight ? { height: dragHeight, transition: "none" } : undefined
        }
      >
        <button
          className="sheet-handle"
          aria-label="Expand or collapse nearby issues"
          aria-expanded={snap === "expanded"}
          onPointerDown={dragStart}
          onPointerMove={dragMove}
          onPointerUp={(e) => {
            if (e.pointerType !== "touch") finishDrag();
          }}
          onTouchStart={touchStart}
          onTouchMove={touchMove}
          onTouchEnd={finishDrag}
          onTouchCancel={() => {
            drag.current = null;
            setDragHeight(null);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDragHeight(null);
          }}
          onKeyDown={(e) => {
            if (["ArrowUp", "ArrowDown", "Enter", " "].includes(e.key)) {
              e.preventDefault();
              setSnap(
                e.key === "ArrowDown"
                  ? "collapsed"
                  : snap === "expanded" && e.key !== "ArrowUp"
                    ? "middle"
                    : "expanded",
              );
            }
          }}
        >
          <span />
        </button>
        <div
          className="sheet-heading"
          onTouchStart={(e) => {
            if (!(e.target as HTMLElement).closest("button")) touchStart(e);
          }}
          onTouchMove={touchMove}
          onTouchEnd={finishDrag}
          onTouchCancel={() => {
            drag.current = null;
            setDragHeight(null);
          }}
        >
          <div>
            <h1>
              Around you <span>{issues.length}</span>
            </h1>
          </div>
        </div>
        <div className="nearby-list">
          {issues.length ? (
            issues.map(({ issue, distance }) => (
              <Link
                className="issue-row"
                href={`/issues/${issue.id}`}
                key={issue.id}
              >
                <Image
                  src={issuePhoto(issue)}
                  width={64}
                  height={64}
                  alt=""
                  unoptimized
                />
                <div className="issue-row-copy">
                  <strong>{issue.report.title}</strong>
                  <ReportedStatus issue={issue} />
                </div>
                <span className="issue-distance">
                  {distanceLabel(distance)}
                </span>
                <ChevronRight size={16} className="row-chevron" />
              </Link>
            ))
          ) : (
            <p className="empty-search">
              {query
                ? `No issues match “${query}”.`
                : "No reported issues here yet."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
