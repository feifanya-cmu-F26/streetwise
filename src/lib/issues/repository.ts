import "server-only";
import {
  createSupabaseRepository,
  type IssueRepository,
} from "@/lib/supabase/issues";

export type { IssueRepository };

// Persistence is Supabase-only: there is no in-process fallback, so a missing
// SUPABASE_* configuration fails loudly instead of quietly serving fixtures.
export function getIssueRepository(): IssueRepository {
  return createSupabaseRepository();
}
