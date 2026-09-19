import { apiRoute, demoResponse, readJson } from "@/lib/api/route";
import { getIssueRepository } from "@/lib/issues/repository";
import { createIssueRequestSchema } from "@/schemas/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return apiRoute(async () => demoResponse(getIssueRepository().list()));
}
export async function POST(request: Request) {
  return apiRoute(async () => {
    const input = await readJson(request, createIssueRequestSchema);
    return demoResponse(getIssueRepository().create(input), 201);
  });
}
