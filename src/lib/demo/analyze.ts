import {
  issueAnalysisSchema,
  type DemoAnalyzeRequest,
} from "@/schemas/analysis";
import { issueTypeLabels } from "@/lib/issues/labels";

export function analyzeDemoIssue(input: DemoAnalyzeRequest) {
  const label = issueTypeLabels[input.demoIssueType];
  const description = `Sample ${label.toLowerCase()} report for reviewing the Streetwise workflow. No image analysis has been performed.`;
  return issueAnalysisSchema.parse({
    mode: "demo",
    issueType: input.demoIssueType,
    severity: "medium",
    description,
    location: input.location,
    imageUrl: null,
    duplicate: { isDuplicate: false, existingIssueId: null, confidence: 0 },
    authority: {
      status: "needs_review",
      authority: null,
      reason:
        "Demo analysis does not verify jurisdiction. The pipeline owner will connect the authority resolver.",
    },
    generatedReport: {
      title: `${label} at the selected location`,
      description,
      category: input.demoIssueType,
    },
    needsReview: true,
  });
}
