import "server-only";
import { requireDemoMode } from "@/lib/env";
import { analyzeDemoIssue } from "@/lib/demo/analyze";
import type { AnalyzeRequest } from "@/schemas/analysis";

export async function analyzeIssue(input: AnalyzeRequest) {
  requireDemoMode();
  // Live orchestration belongs here: Storage → vision → geo → duplicate → authority → report.
  return analyzeDemoIssue(input);
}
