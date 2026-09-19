import "server-only";
import { requireDemoMode } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";
import { analyzeDemoIssue } from "@/lib/demo/analyze";
import type { AnalyzeRequest } from "@/schemas/analysis";

export async function analyzeIssue(input: AnalyzeRequest) {
  if (input.mode === "demo") {
    requireDemoMode();
    return analyzeDemoIssue(input);
  }
  // Live orchestration belongs here: Storage → vision → geo → duplicate → authority → report.
  // The upload contract and storagePath exist (see /api/issues/upload); this
  // orchestration is Next work #3 in docs/agents/report-pipeline.AGENTS.md.
  throw new ApiError(
    501,
    "LIVE_ANALYSIS_NOT_IMPLEMENTED",
    "Live analysis is not connected yet. Only the upload contract is defined.",
  );
}
