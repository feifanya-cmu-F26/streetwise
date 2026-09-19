import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requiredServerEnv } from "@/lib/env";

// Privileged server-only access. Private route callers must enforce owner scope.
export function createServerSupabaseClient() {
  return createClient(
    requiredServerEnv("SUPABASE_URL"),
    requiredServerEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
