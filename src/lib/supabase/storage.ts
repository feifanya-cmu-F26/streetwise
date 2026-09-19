import "server-only";
import { randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { requiredServerEnv } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";
import type { AcceptedImageType, UploadResponse } from "@/schemas/upload";

const EXTENSION_BY_TYPE: Record<AcceptedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Evidence photos are never analyzed until moved out of `pending/`; the
// analysis step (Next work #3) is responsible for that promotion.
export async function createEvidenceUploadUrl(
  contentType: AcceptedImageType,
): Promise<UploadResponse> {
  const bucket = requiredServerEnv("SUPABASE_STORAGE_BUCKET");
  const storagePath = `pending/${randomUUID()}.${EXTENSION_BY_TYPE[contentType]}`;
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
  return { storagePath, uploadUrl: data.signedUrl, token: data.token };
}
