import "server-only";
import { ApiError } from "@/lib/api/errors";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { issueFromRow, type IssueRow } from "@/lib/issues/mapping";
import { signEvidenceReadUrls } from "./storage";
import { visiblePhotoPath } from "@/lib/issues/photo-access";
import type { ConfirmationRequest, Issue } from "@/schemas/issue";

const SELECT =
  "*, submissions(status, external_request_id, external_status_url)";

function failed(action: string): never {
  throw new ApiError(502, "DATABASE_ERROR", `Could not ${action}.`);
}

async function toIssues(rows: IssueRow[], viewerId?: string): Promise<Issue[]> {
  const paths = rows.map(row => visiblePhotoPath(row, viewerId)).filter((p): p is string => !!p);
  const urls = await signEvidenceReadUrls(paths);
  return rows.map((row) =>
    issueFromRow(
      {
        ...row,
        submissions: row.submissions
          ? {
              ...row.submissions,
              external_request_id: null,
              external_status_url: null,
            }
          : null,
      },
      urls.get(visiblePhotoPath(row, viewerId) || "") ?? null,
    ),
  );
}

export function createSupabaseRepository() {
  const supabase = createServerSupabaseClient();
  async function get(id: string, viewerId?: string): Promise<Issue> {
    const { data, error } = await supabase
      .from("issues")
      .select(SELECT)
      .eq("id", id)
      .eq("is_demo", false)
      .maybeSingle<IssueRow>();
    if (error) failed("load this issue");
    if (!data) {
      throw new ApiError(404, "ISSUE_NOT_FOUND", "This issue was not found.");
    }
    return (await toIssues([data], viewerId))[0];
  }
  return {
    async list(viewerId?: string): Promise<Issue[]> {
      const { data, error } = await supabase
        .from("issues")
        .select(SELECT)
        .eq("is_demo", false)
        .order("created_at", { ascending: false })
        .returns<IssueRow[]>();
      if (error) failed("load issues");
      return toIssues(data ?? [], viewerId);
    },
    get,
    async confirm(
      id: string,
      input: ConfirmationRequest,
      ownerId: string,
    ): Promise<Issue> {
      await get(id);
      // Insert only: the migration's trigger updates the counters atomically,
      // so concurrent confirmations cannot lose an observation.
      const { error } = await supabase
        .from("observations")
        .insert({ issue_id: id, kind: input.kind, owner_id: ownerId });
      if (error && error.code !== "23505") failed("record this observation");
      return get(id, ownerId);
    },
  };
}
export type IssueRepository = ReturnType<typeof createSupabaseRepository>;
