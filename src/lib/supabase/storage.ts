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

// Fixed owner-scoped paths are linked transactionally at report approval.
export async function createEvidenceUploadUrl(
  input: UploadRequest,
  ownerId: string,
): Promise<UploadResponse> {
  const bucket = requiredServerEnv("SUPABASE_STORAGE_BUCKET");
  const storagePath = `evidence/${ownerId}/${randomUUID()}.${EXTENSION_BY_TYPE[input.contentType]}`;
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
    owner_id: ownerId,
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

// Only an unclaimed photo owned by this user can enter live analysis.
export async function assertEvidenceAvailable(
  storagePath: string,
  ownerId?: string,
) {
  let query = createServerSupabaseClient()
    .from("evidence")
    .select("storage_path")
    .eq("storage_path", storagePath)
    .is("issue_id", null);
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data, error } = await query.maybeSingle();
  if (error)
    throw new ApiError(
      502,
      "EVIDENCE_LOOKUP_FAILED",
      "Could not check this photo.",
    );
  if (!data) {
    throw new ApiError(
      400,
      "EVIDENCE_NOT_AVAILABLE",
      "This photo was not uploaded for a new report, or is already attached to one.",
    );
  }
}
