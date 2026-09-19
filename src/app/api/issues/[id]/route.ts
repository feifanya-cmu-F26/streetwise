import { apiRoute, demoResponse, issueIdFrom } from "@/lib/api/route";
import { getIssueRepository } from "@/lib/issues/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiRoute(async () =>
    demoResponse(
      await getIssueRepository().get(await issueIdFrom(context)),
      200,
      "live",
    ),
  );
}
