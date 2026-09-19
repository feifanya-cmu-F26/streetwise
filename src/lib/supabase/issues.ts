import "server-only";
import { ApiError } from "@/lib/api/errors";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import {
  assertEvidenceAvailable,
  promoteEvidence,
  signEvidenceReadUrls,
} from "@/lib/supabase/storage";
import {
  insertRowFromRequest,
  issueFromRow,
  type IssueRow,
} from "@/lib/issues/mapping";
import { createIssueRequestSchema } from "@/schemas/analysis";
import type { CreateIssueRequest } from "@/schemas/analysis";
import type { ConfirmationRequest, Issue } from "@/schemas/issue";

const SELECT =
  "*, submissions(status, external_request_id, external_status_url)";

function failed(action: string): never {
  throw new ApiError(502, "DATABASE_ERROR", `Could not ${action}.`);
}

async function toIssues(rows: IssueRow[]): Promise<Issue[]> {
  const signed = await signEvidenceReadUrls(
    rows.flatMap((row) => (row.image_path ? [row.image_path] : [])),
  );
  return rows.map((row) =>
    issueFromRow(row, row.image_path ? (signed.get(row.image_path) ?? null) : null),
  );
}

export function createSupabaseRepository() {
  const supabase = createServerSupabaseClient();
  async function get(id: string): Promise<Issue> {
    const { data, error } = await supabase
      .from("issues")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle<IssueRow>();
    if (error) failed("load this issue");
    if (!data) {
      throw new ApiError(404, "ISSUE_NOT_FOUND", "This issue was not found.");
    }
    return (await toIssues([data]))[0];
  }
  return {
    async list(): Promise<Issue[]> {
      const { data, error } = await supabase
        .from("issues")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .returns<IssueRow[]>();
      if (error) failed("load issues");
      return toIssues(data ?? []);
    },
    get,
    async create(input: CreateIssueRequest): Promise<Issue> {
      const parsed = createIssueRequestSchema.parse(input);
      if (parsed.analysis.duplicate.isDuplicate) {
        throw new ApiError(
          409,
          "POSSIBLE_DUPLICATE",
          "Review the existing issue before creating another report.",
        );
      }
      const { imagePath } = parsed.analysis;
      // Rejected before anything is written, so an unusable photo cannot leave
      // an orphaned issue behind.
      if (imagePath) await assertEvidenceAvailable(imagePath);
      const { data, error } = await supabase
        .from("issues")
        .insert(insertRowFromRequest(parsed, null))
        .select(SELECT)
        .single<IssueRow>();
      if (error || !data) failed("create this issue");
      if (imagePath) {
        try {
          const promoted = await promoteEvidence(imagePath, data.id);
          const updated = await supabase
            .from("issues")
            .update({ image_path: promoted })
            .eq("id", data.id);
          if (updated.error) failed("attach the photo to this issue");
        } catch (promotionError) {
          // Postgres cannot roll this back for us: the insert already
          // committed. Drop the issue rather than keep one that silently lost
          // the photo it was reported with.
          await supabase.from("issues").delete().eq("id", data.id);
          throw promotionError;
        }
      }
      return get(data.id);
    },
    async confirm(id: string, input: ConfirmationRequest): Promise<Issue> {
      await get(id);
      // Insert only: the migration's trigger updates the counters atomically,
      // so concurrent confirmations cannot lose an observation.
      const { error } = await supabase
        .from("observations")
        .insert({ issue_id: id, kind: input.kind });
      if (error) failed("record this observation");
      return get(id);
    },
  };
}
export type IssueRepository = ReturnType<typeof createSupabaseRepository>;
