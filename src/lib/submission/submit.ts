import "server-only";
import { requireDemoMode } from "@/lib/env";
import { getIssueRepository } from "@/lib/issues/repository";
import { prepareDemoSubmission } from "./demo";

export async function submitIssue(id: string) {
  requireDemoMode();
  return prepareDemoSubmission(getIssueRepository().get(id));
}
