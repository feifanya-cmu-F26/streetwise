import { apiRoute } from "@/lib/api/route";
import { ApiError } from "@/lib/api/errors";
export async function POST() {
  return apiRoute(async () => {
    throw new ApiError(
      410,
      "USE_REPORT_FLOW",
      "Submit through your authenticated report review.",
    );
  });
}
