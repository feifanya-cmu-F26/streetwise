import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { requiredServerEnv } from "@/lib/env";

// Persist only PKCE verifiers here. Session tokens use the dedicated HttpOnly
// cookies in server.ts, so the SDK cannot expose them to browser JavaScript.
export async function emailAuthClient(request: Request) {
  const jar = await cookies();
  const isVerifier = (key: string) =>
    key.startsWith("streetwise-pkce-") && key.endsWith("-code-verifier");
  return createClient(requiredServerEnv("SUPABASE_URL"), requiredServerEnv("SUPABASE_SECRET_KEY"), {
    auth: {
      flowType: "pkce",
      storageKey: "streetwise-pkce",
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => isVerifier(key) ? jar.get(key)?.value ?? null : null,
        setItem: (key, value) => {
          if (isVerifier(key)) jar.set(key, value, {
            httpOnly: true, secure: new URL(request.url).protocol === "https:",
            sameSite: "lax", path: "/", maxAge: 3600,
          });
        },
        removeItem: (key) => { if (isVerifier(key)) jar.delete(key); },
      },
    },
  });
}
