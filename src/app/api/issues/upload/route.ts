import { apiRoute, demoResponse, readJson } from "@/lib/api/route";
import { uploadRequestSchema } from "@/schemas/upload";
import { createEvidenceUploadUrl } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return apiRoute(async () => {
    const input = await readJson(request, uploadRequestSchema);
    return demoResponse(await createEvidenceUploadUrl(input), 200, "live");
  });
}
