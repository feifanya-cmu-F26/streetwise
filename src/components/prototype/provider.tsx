"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { prototypeStateSchema, type PrototypeState } from "@/schemas/prototype";
import {
  advanceSubmission,
  actOnSubmission,
  createSubmission,
  type WorkflowAction,
} from "@/lib/demo/workflow";
import type { IssueLocation } from "@/schemas/issue";

const KEY = "streetwise-prototype-v1";
const initial: PrototypeState = {
  version: 1,
  submissions: [],
  observations: {},
};
type Store = {
  state: PrototypeState;
  ready: boolean;
  storageError: string;
  create: (
    photo: string,
    description: string,
    location: IssueLocation,
  ) => string;
  act: (id: string, action: WorkflowAction) => void;
  observe: (id: string, kind: "stillThere" | "resolved") => void;
};
const Context = createContext<Store | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const saved = localStorage.getItem(KEY);
        if (saved) setState(prototypeStateSchema.parse(JSON.parse(saved)));
      } catch {
        setStorageError(
          "Saved demo data could not be read. This session still works.",
        );
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY || !event.newValue) return;
      try {
        const saved = prototypeStateSchema.parse(JSON.parse(event.newValue));
        setState((current) =>
          JSON.stringify(current) === event.newValue ? current : saved,
        );
      } catch {
        setStorageError(
          "Another tab saved unreadable demo data. This tab kept its current state.",
        );
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      Promise.resolve().then(() =>
        setStorageError(
          "Device storage is full or unavailable. New changes will last only for this session.",
        ),
      );
    }
  }, [state, ready]);
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      setState((current) => {
        const next = current.submissions.map((item) =>
          advanceSubmission(item, Date.now()),
        );
        return next.some((item, index) => item !== current.submissions[index])
          ? { ...current, submissions: next }
          : current;
      });
    }, 700);
    return () => clearInterval(timer);
  }, [ready]);
  const create = useCallback(
    (photo: string, description: string, location: IssueLocation) => {
      const item = createSubmission(photo, description, location);
      setState((current) => ({
        ...current,
        submissions: [item, ...current.submissions],
      }));
      return item.id;
    },
    [],
  );
  const act = useCallback(
    (id: string, action: WorkflowAction) =>
      setState((current) => ({
        ...current,
        submissions: current.submissions.map((item) =>
          item.id === id ? actOnSubmission(item, action) : item,
        ),
      })),
    [],
  );
  const observe = useCallback(
    (id: string, kind: "stillThere" | "resolved") =>
      setState((current) => {
        const previous = current.observations[id] || {
          stillThere: 0,
          resolved: 0,
        };
        return {
          ...current,
          observations: {
            ...current.observations,
            [id]: { ...previous, [kind]: previous[kind] + 1 },
          },
        };
      }),
    [],
  );
  return (
    <Context.Provider
      value={{ state, ready, storageError, create, act, observe }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePrototype() {
  const value = useContext(Context);
  if (!value) throw new Error("PrototypeProvider is required");
  return value;
}
