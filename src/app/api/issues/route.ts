import { apiRoute, demoResponse } from "@/lib/api/route";
import { getIssueRepository } from "@/lib/issues/repository";
import { currentUser } from "@/lib/auth/server";
import { ApiError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return apiRoute(async () =>
    demoResponse(await getIssueRepository().list((await currentUser(request))?.id), 200, "live"),
  );
}
export async function POST(request: Request) {
  return apiRoute(async () => {
    void request;
    throw new ApiError(
      410,
      "USE_REPORT_FLOW",
      "Create and review a report through /api/reports.",
    );
  });
}
