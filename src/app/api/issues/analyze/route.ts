import { apiRoute } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
// Analysis is durable and owner-scoped through POST /api/reports.
export async function POST() {
  return apiRoute(async () => {
    throw new ApiError(
      410,
      "USE_REPORT_FLOW",
      "Create a report through /api/reports to analyze an uploaded photo.",
    );
  });
}
