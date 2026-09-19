import "server-only";
import { ApiError } from "@/lib/api/errors";
import type { Issue } from "@/schemas/issue";

// Integration lead: install the agreed Stagehand SDK when implementing this adapter.
// Return a separate live preparation schema with session URL and an explicit final approval boundary.
export async function prepareGovernmentForm(issue: Issue): Promise<never> {
  void issue;
  throw new ApiError(
    501,
    "BROWSER_NOT_IMPLEMENTED",
    "Stagehand / Browserbase form preparation is not connected. No browser session was opened.",
  );
}
