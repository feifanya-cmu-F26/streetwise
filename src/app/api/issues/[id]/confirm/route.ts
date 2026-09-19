import { apiRoute, demoResponse, issueIdFrom, readJson } from "@/lib/api/route";
import { getIssueRepository } from "@/lib/issues/repository";
import { confirmationRequestSchema } from "@/schemas/issue";

import { requireUser, assertSameOrigin, limit } from "@/lib/auth/server";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    await limit(`observe:${user.id}`, 60, 3600);
    const id = await issueIdFrom(context);
    const input = await readJson(request, confirmationRequestSchema);
    return demoResponse(
      await getIssueRepository().confirm(id, input, user.id),
      200,
      "live",
    );
  });
}
