"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { IssueLocation } from "@/schemas/issue";
import { currentLocation, watchLocation, LocationError } from "@/lib/client/location";

type LocationState = {
  point: IssueLocation | null;
  locating: boolean;
  error: string;
  request: () => Promise<IssueLocation | null>;
  dismissError: () => void;
};
const Context = createContext<LocationState | null>(null);
export function LocationProvider({ children }: { children: ReactNode }) {
  const [point, setPoint] = useState<IssueLocation | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<Promise<IssueLocation | null> | null>(null);
  const request = useCallback(() => {
    if (pending.current) return pending.current;
    setLocating(true);
    setError("");
    const task = currentLocation()
      .then((fix) => {
        setPoint(fix);
        setEnabled(true);
        return fix;
      })
      .catch((error: Error) => {
        setError(error.message);
        setPoint(null);
        setEnabled(false);
        return null;
      })
      .finally(() => {
        pending.current = null;
        setLocating(false);
      });
    pending.current = task;
    return task;
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let stop: (() => void) | undefined;
    const sync = () => {
      stop?.();
      stop = undefined;
      if (document.visibilityState === "hidden") return;
      try {
        stop = watchLocation(
          (fix) => {
            setPoint(fix);
            setError("");
          },
          (error) => {
            setError(error.message);
            // A transient timeout must not erase a valid fix or stop all future
            // movement updates. Permission revocation does stop the watcher.
            if (error instanceof LocationError && error.code === 1) {
              setPoint(null);
              setEnabled(false);
            }
          },
        );
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Location unavailable.",
        );
        setPoint(null);
        setEnabled(false);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop?.();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled]);
  return (
    <Context.Provider
      value={{
        point,
        locating,
        error,
        request,
        dismissError: () => setError(""),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLocation() {
  const context = useContext(Context);
  if (!context) throw new Error("LocationProvider is required");
  return context;
}
