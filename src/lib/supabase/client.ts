import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requiredServerEnv } from "@/lib/env";

// Not called in demo mode. The pipeline owner must add tables, RLS and upload policy first.
export function createServerSupabaseClient() {
  return createClient(
    requiredServerEnv("SUPABASE_URL"),
    requiredServerEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
