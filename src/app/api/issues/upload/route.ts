import { apiRoute, demoResponse, readJson } from "@/lib/api/route";
import { uploadRequestSchema } from "@/schemas/upload";
import { createEvidenceUploadUrl } from "@/lib/supabase/storage";

import { requireUser, assertSameOrigin, limit } from "@/lib/auth/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    await limit(`upload:${user.id}`, 30, 3600);
    const input = await readJson(request, uploadRequestSchema);
    return demoResponse(
      await createEvidenceUploadUrl(input, user.id),
      200,
      "live",
    );
  });
}
