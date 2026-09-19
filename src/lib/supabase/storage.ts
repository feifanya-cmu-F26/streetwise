import "server-only";
import { randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { requiredServerEnv } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";
import type { UploadRequest, UploadResponse } from "@/schemas/upload";

const EXTENSION_BY_TYPE: Record<UploadRequest["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Evidence photos are never analyzed until moved out of `pending/`; the
// analysis step (Next work #3) is responsible for that promotion.
export async function createEvidenceUploadUrl(
  input: UploadRequest,
): Promise<UploadResponse> {
  const bucket = requiredServerEnv("SUPABASE_STORAGE_BUCKET");
  const storagePath = `pending/${randomUUID()}.${EXTENSION_BY_TYPE[input.contentType]}`;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    throw new ApiError(
      502,
      "STORAGE_SIGN_FAILED",
      "Could not create a signed upload URL.",
    );
  }
  // size_bytes/content_type are the client's claims; the bucket's
  // file_size_limit and allowed_mime_types are what actually enforce them.
  const inserted = await supabase.from("evidence").insert({
    storage_path: storagePath,
    content_type: input.contentType,
    size_bytes: input.sizeBytes,
  });
  if (inserted.error) {
    throw new ApiError(
      502,
      "EVIDENCE_RECORD_FAILED",
      "Could not record the evidence upload.",
    );
  }
  return { storagePath, uploadUrl: data.signedUrl, token: data.token };
}

const READ_URL_TTL_SECONDS = 60 * 60;

// Signed per read because the bucket is private. Callers must not persist the
// result: it expires, and a stored copy would rot into a broken link.
export async function signEvidenceReadUrls(
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  const bucket = requiredServerEnv("SUPABASE_STORAGE_BUCKET");
  const { data } = await createServerSupabaseClient()
    .storage.from(bucket)
    .createSignedUrls(paths, READ_URL_TTL_SECONDS);
  // A missing signature degrades that one issue to imageUrl: null rather than
  // failing the whole list read.
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) signed.set(item.path, item.signedUrl);
  }
  return signed;
}

// Moves an accepted photo out of `pending/`, so a sweeper can treat whatever
// is still there as garbage.
// Creation trusts a caller-supplied analysis, so the path is an untrusted
// claim. Only an evidence slot this server issued and nothing has claimed yet
// may be attached, otherwise a client could point a new issue at someone
// else's photo. Checked before an issue row exists so a bad path cannot leave
// a half-created issue behind.
export async function assertEvidenceAvailable(storagePath: string) {
  const { data } = await createServerSupabaseClient()
    .from("evidence")
    .select("storage_path")
    .eq("storage_path", storagePath)
    .is("issue_id", null)
    .maybeSingle();
  if (!data) {
    throw new ApiError(
      400,
      "EVIDENCE_NOT_AVAILABLE",
      "This photo was not uploaded for a new report, or is already attached to one.",
    );
  }
}

export async function promoteEvidence(
  storagePath: string,
  issueId: string,
): Promise<string> {
  const bucket = requiredServerEnv("SUPABASE_STORAGE_BUCKET");
  const supabase = createServerSupabaseClient();
  await assertEvidenceAvailable(storagePath);
  const promotedPath = `issues/${issueId}/${storagePath.split("/").pop()}`;
  const { error } = await supabase.storage
    .from(bucket)
    .move(storagePath, promotedPath);
  if (error) {
    throw new ApiError(
      502,
      "EVIDENCE_PROMOTE_FAILED",
      "Could not attach the uploaded photo to this issue.",
    );
  }
  await supabase
    .from("evidence")
    .update({ issue_id: issueId, storage_path: promotedPath })
    .eq("storage_path", storagePath);
  return promotedPath;
}
