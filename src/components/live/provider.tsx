"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Issue } from "@/schemas/issue";
import { issueSchema } from "@/schemas/issue";
import { EmailReturn } from "./email-return";
import { mapExamples } from "@/lib/demo/map-issues";
export async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error?.message || "Request failed. Try again.");
  return payload.data as T;
}
type User = { id: string; email: string | null; isAnonymous: boolean };
const Context = createContext<{
  user: User | null;
  ready: boolean;
  issues: Issue[];
  error: string;
  refresh: () => Promise<void>;
} | null>(null);
export function LiveProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [issues, setIssues] = useState<Issue[]>([]),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      request<User | null>("/api/auth"),
      request<unknown>("/api/issues"),
    ]);
    if (results[0].status === "fulfilled") setUser(results[0].value);
    if (results[1].status === "fulfilled") {
      const parsed = issueSchema.array().safeParse(results[1].value);
      if (parsed.success) {
        setIssues([...parsed.data, ...mapExamples]);
        setError("");
      } else setError("Issue data could not be loaded.");
    } else setError(results[1].reason.message);
    setReady(true);
  }, []);
  useEffect(() => {
    const start = setTimeout(() => void refresh(), 0);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(start);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  return (
    <Context.Provider value={{ user, ready, issues, error, refresh }}>
      <EmailReturn />
      {children}
    </Context.Provider>
  );
}
export function useLive() {
  const state = useContext(Context);
  if (!state) throw new Error("LiveProvider required");
  return state;
}
export function SignIn() {
  const { refresh, ready } = useLive();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState(""),
    [sent, setSent] = useState(false),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="auth-panel">
      <h2>Make your neighborhood better</h2>
      <p>No account needed. Your reports stay in this browser.</p>
      <button
        type="button"
        className="primary-button"
        disabled={busy || !ready}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await request("/api/auth", { action: "guest" });
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Please wait…" : "Continue as guest"}
      </button>
      <p className="guest-note">Clearing browser data or switching devices loses access to guest reports.</p>
      <button type="button" className="text-button" aria-expanded={emailOpen} disabled={busy} onClick={() => setEmailOpen(!emailOpen)}>
        {emailOpen ? "Hide email sign-in" : "Sign in with email instead"}
      </button>
      {error && <p role="alert">{error}</p>}
      {emailOpen && (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await request(
              "/api/auth",
              sent
                ? { action: "verify", email, token }
                : { action: "send", email },
            );
            if (sent) await refresh();
            else setSent(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            required
            disabled={sent}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {sent && (
          <p>Check your email and open the sign-in link. If your email contains a code, enter it below.</p>
        )}
        {sent && (
          <label>
            Email code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              minLength={6}
              maxLength={10}
            />
          </label>
        )}
        <button className="primary-button" disabled={busy || !ready}>
          {busy ? "Please wait…" : sent ? "Verify code" : "Send sign-in email"}
        </button>
        {sent && (
          <button
            type="button"
            className="text-button"
            onClick={() => setSent(false)}
          >
            Use another email or resend
          </button>
        )}
      </form>
      )}
    </section>
  );
}
