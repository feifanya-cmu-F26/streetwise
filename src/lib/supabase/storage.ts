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
