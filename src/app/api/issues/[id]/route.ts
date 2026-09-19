import { apiRoute, demoResponse, issueIdFrom } from "@/lib/api/route";
import { currentUser } from "@/lib/auth/server";
import { getIssueRepository } from "@/lib/issues/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiRoute(async () =>
    demoResponse(
      await getIssueRepository().get(await issueIdFrom(context), (await currentUser(request))?.id),
      200,
      "live",
    ),
  );
}
