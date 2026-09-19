import type { Issue } from "@/schemas/issue";
import { submissionResultSchema } from "@/schemas/submission";

export function prepareDemoSubmission(issue: Issue) {
  return submissionResultSchema.parse({
    mode: "demo",
    issueId: issue.id,
    status: "prepared",
    submittedToGovernment: false,
    message:
      "Demo report prepared. No browser session was opened and nothing was sent to a government agency.",
  });
}
