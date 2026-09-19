import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { ApiError } from "@/lib/api/errors";
import type { Session } from "@supabase/supabase-js";
const ACCESS = "streetwise-access",
  REFRESH = "streetwise-refresh";
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new ApiError(
      403,
      "ORIGIN_REJECTED",
      "Reload this page and try again.",
    );
}
export async function saveSession(session: Session, request: Request) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
  };
  jar.set(ACCESS, session.access_token, {
    ...options,
    maxAge: session.expires_in,
  });
  jar.set(REFRESH, session.refresh_token, {
    ...options,
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS);
  jar.delete(REFRESH);
}
export async function currentUser(request: Request) {
  const jar = await cookies(),
    access = jar.get(ACCESS)?.value,
    refresh = jar.get(REFRESH)?.value;
  const db = createServerSupabaseClient();
  if (access) {
    const { data, error } = await db.auth.getUser(access);
    if (!error && data.user) return data.user;
  }
  if (refresh) {
    const { data, error } = await db.auth.refreshSession({
      refresh_token: refresh,
    });
    if (!error && data.session && data.user) {
      await saveSession(data.session, request);
      return data.user;
    }
  }
  return null;
}
export async function requireUser(request: Request) {
  const user = await currentUser(request);
  if (!user)
    throw new ApiError(401, "SIGN_IN_REQUIRED", "Sign in to continue.");
  return user;
}
export async function limit(key: string, count: number, seconds: number) {
  const hash = createHash("sha256").update(key).digest("hex");
  const { data, error } = await createServerSupabaseClient().rpc(
    "consume_request_limit",
    { p_key: hash, p_limit: count, p_seconds: seconds },
  );
  if (error)
    throw new ApiError(
      503,
      "LIVE_SETUP_REQUIRED",
      "Live database setup is incomplete. Please contact the project owner.",
    );
  if (!data)
    throw new ApiError(
      429,
      "TOO_MANY_REQUESTS",
      "Too many attempts. Please try again later.",
    );
}
