import { ApiError } from "@/lib/api/errors";
import { seedIssues } from "./fixtures";
import {
  issueSchema,
  type ConfirmationRequest,
  type Issue,
} from "@/schemas/issue";
import {
  createIssueRequestSchema,
  type CreateIssueRequest,
} from "@/schemas/analysis";

// Factory stays independent of HTTP and server-only imports for contract tests.
export function createDemoRepository(initial: Issue[] = seedIssues) {
  const issues = new Map(
    initial.map((issue) => [issue.id, structuredClone(issue)]),
  );
  function get(id: string) {
    const issue = issues.get(id);
    if (!issue)
      throw new ApiError(
        404,
        "ISSUE_NOT_FOUND",
        "This demo issue was not found. The server may have restarted.",
      );
    return structuredClone(issue);
  }
  return {
    list: () =>
      Array.from(issues.values(), (issue) => structuredClone(issue)).reverse(),
    get,
    create(input: CreateIssueRequest) {
      const { analysis, report } = createIssueRequestSchema.parse(input);
      if (analysis.duplicate.isDuplicate) {
        throw new ApiError(
          409,
          "POSSIBLE_DUPLICATE",
          "Review the existing issue before creating another report.",
        );
      }
      const now = new Date().toISOString();
      const issue = issueSchema.parse({
        id: crypto.randomUUID(),
        type: analysis.issueType,
        severity: analysis.severity,
        location: analysis.location,
        imageUrl: analysis.imageUrl,
        report,
        authority: analysis.authority,
        status: "ready",
        community: { stillThere: 0, resolved: 0, lastVerifiedAt: null },
        submission: {
          status: "not_submitted",
          externalRequestId: null,
          externalStatusUrl: null,
        },
        createdAt: now,
        updatedAt: now,
      });
      issues.set(issue.id, issue);
      return structuredClone(issue);
    },
    confirm(id: string, input: ConfirmationRequest) {
      const issue = get(id);
      const now = new Date().toISOString();
      if (input.kind === "still_there") issue.community.stillThere += 1;
      else issue.community.resolved += 1;
      issue.community.lastVerifiedAt = now;
      issue.updatedAt = now;
      issues.set(id, issueSchema.parse(issue));
      return structuredClone(issue);
    },
  };
}
export type IssueRepository = ReturnType<typeof createDemoRepository>;
