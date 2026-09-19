import { timingSafeEqual } from "node:crypto";
import { apiRoute, demoResponse } from "@/lib/api/route";
import { runDueReports } from "@/lib/live/worker";
import { ApiError } from "@/lib/api/errors";
export const maxDuration = 300;
export async function GET(request: Request) {
  return apiRoute(async () => {
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`,
      actual = request.headers.get("authorization") || "";
    if (
      !process.env.CRON_SECRET ||
      actual.length !== expected.length ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    )
      throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
    return demoResponse(await runDueReports(), 200, "live");
  });
}
