import { z } from "zod";
import { apiRoute, demoResponse, readJson } from "@/lib/api/route";
import {
  assertSameOrigin,
  currentUser,
  saveSession,
  clearSession,
  limit,
} from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { ApiError } from "@/lib/api/errors";
import type { User } from "@supabase/supabase-js";
const identity = (user: User) => ({
  id: user.id,
  email: user.email || null,
  isAnonymous: user.is_anonymous === true,
});
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("guest") }).strict(),
  z.object({ action: z.literal("send"), email: z.email().max(254) }).strict(),
  z
    .object({
      action: z.literal("verify"),
      email: z.email().max(254),
      token: z.string().regex(/^\d{6,10}$/),
    })
    .strict(),
  z.object({ action: z.literal("logout") }).strict(),
  z.object({ action: z.literal("exchange"), accessToken: z.string().min(40).max(8000), refreshToken: z.string().min(10).max(2000) }).strict(),
]);
export async function GET(request: Request) {
  return apiRoute(async () => {
    const user = await currentUser(request);
    return demoResponse(
      user ? identity(user) : null,
      200,
      "live",
    );
  });
}
export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const body = await readJson(request, input);
    if (body.action === "guest") {
      // Repeated clicks/revisits must preserve an existing identity and reports.
      const existing = await currentUser(request);
      if (existing) return demoResponse(identity(existing), 200, "live");
      // Vercel overwrites this header with the connecting client IP. Do not
      // trust arbitrary forwarded headers in other deployment environments.
      const clientAddress = process.env.VERCEL
        ? request.headers.get("x-vercel-forwarded-for") || "unknown"
        : "local";
      await limit(`guest:${clientAddress}`, 20, 3600);
      await limit("guest:project", 200, 3600);
      const { data, error } = await createServerSupabaseClient().auth.signInAnonymously();
      if (error || !data.session || !data.user) {
        if (error?.status === 429)
          throw new ApiError(429, "GUEST_RATE_LIMIT", "Too many guest sessions. Try again later.");
        throw new ApiError(503, "GUEST_UNAVAILABLE", "Guest access is temporarily unavailable. Please try again.");
      }
      await saveSession(data.session, request);
      return demoResponse(identity(data.user), 200, "live");
    }
    if (body.action === "logout") {
      await clearSession();
      return demoResponse(null, 200, "live");
    }
    if (body.action === "exchange") {
      const client = createServerSupabaseClient();
      const verified = await client.auth.getUser(body.accessToken);
      if (verified.error || !verified.data.user)
        throw new ApiError(401, "INVALID_EMAIL_LINK", "This sign-in link has expired. Request a new email.");
      const refreshed = await client.auth.refreshSession({ refresh_token: body.refreshToken });
      if (refreshed.error || !refreshed.data.session || refreshed.data.user?.id !== verified.data.user.id)
        throw new ApiError(401, "INVALID_EMAIL_LINK", "This sign-in link has expired. Request a new email.");
      await saveSession(refreshed.data.session, request);
      return demoResponse(identity(refreshed.data.user), 200, "live");
    }
    const email = body.email.toLowerCase();
    await limit(`auth:${email}`, 10, 3600);
    const client = createServerSupabaseClient();
    if (body.action === "send") {
      const { error } = await client.auth.signInWithOtp({
        email,
        // Default Supabase templates also use this flow for confirmation/invite
        // links. The root client consumes the fragment and exchanges it for
        // validated HttpOnly cookies, including when opened in another browser.
        options: { shouldCreateUser: true, emailRedirectTo: new URL("/", request.url).href },
      });
      if (error) {
        if (error.code === "over_email_send_rate_limit")
          throw new ApiError(429, "EMAIL_RATE_LIMIT", "The email provider's sending limit has been reached. Use an existing unused link, or try again later.");
        if (error.code === "email_address_not_authorized")
          throw new ApiError(403, "EMAIL_NOT_ENABLED", "Email delivery is currently limited to the project team. The project owner needs to configure SMTP for other addresses.");
        throw new ApiError(
          502,
          "EMAIL_FAILED",
          "Could not send the sign-in email. Check email authentication configuration or try later.",
        );
      }
      return demoResponse({ sent: true }, 200, "live");
    }
    const { data, error } = await client.auth.verifyOtp({
      email,
      token: body.token,
      type: "email",
    });
    if (error || !data.session || !data.user)
      throw new ApiError(
        401,
        "INVALID_CODE",
        "This sign-in code is invalid or expired.",
      );
    await saveSession(data.session, request);
    return demoResponse(
      identity(data.user),
      200,
      "live",
    );
  });
}
