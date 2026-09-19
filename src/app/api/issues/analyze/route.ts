import { apiRoute, demoResponse, readJson } from "@/lib/api/route";
import { analyzeRequestSchema } from "@/schemas/analysis";
import { analyzeIssue } from "@/lib/report/analyze";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return apiRoute(async () =>
    demoResponse(
      await analyzeIssue(await readJson(request, analyzeRequestSchema)),
    ),
  );
}
