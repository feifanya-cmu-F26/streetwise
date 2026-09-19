import { apiRoute, demoResponse, issueIdFrom, readJson } from "@/lib/api/route";
import { submitIssue } from "@/lib/submission/submit";
import { submissionRequestSchema } from "@/schemas/submission";

export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiRoute(async () => {
    await readJson(request, submissionRequestSchema);
    return demoResponse(await submitIssue(await issueIdFrom(context)));
  });
}
