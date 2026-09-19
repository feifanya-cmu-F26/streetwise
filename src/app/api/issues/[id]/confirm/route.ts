import { apiRoute, demoResponse, issueIdFrom, readJson } from "@/lib/api/route";
import { getIssueRepository } from "@/lib/issues/repository";
import { confirmationRequestSchema } from "@/schemas/issue";

export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiRoute(async () => {
    const id = await issueIdFrom(context);
    const input = await readJson(request, confirmationRequestSchema);
    return demoResponse(getIssueRepository().confirm(id, input));
  });
}
