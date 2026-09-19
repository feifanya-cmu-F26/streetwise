import "server-only";
import { requireDemoMode } from "@/lib/env";
import { analyzeDemoIssue } from "@/lib/demo/analyze";
import { analyzeImage } from "@/lib/ai/analyze-image";
import { findDuplicateCandidates } from "@/lib/issues/duplicates";
import { reverseGeocode } from "@/lib/geo/reverse-geocode";
import {
  assertEvidenceAvailable,
  signEvidenceReadUrls,
} from "@/lib/supabase/storage";
import { ApiError } from "@/lib/api/errors";
import { issueAnalysisSchema, type AnalyzeRequest } from "@/schemas/analysis";
import type { IssueLocation, IssueType } from "@/schemas/issue";

// A user-supplied address wins: overwriting what someone typed with a
// geocoder's guess loses local knowledge.
async function enrich(location: IssueLocation, issueType: IssueType) {
  const [duplicateCandidates, geocoded] = await Promise.all([
    findDuplicateCandidates(location, issueType),
    location.address ? null : reverseGeocode(location),
  ]);
  return {
    location: geocoded ? { ...location, address: geocoded } : location,
    duplicateCandidates,
  };
}

export async function analyzeIssue(input: AnalyzeRequest) {
  if (input.mode === "demo") {
    requireDemoMode();
    const analysis = analyzeDemoIssue(input);
    // Candidates and the address are real even though the rest is simulated.
    return { ...analysis, ...(await enrich(input.location, analysis.issueType)) };
  }

  // The path is an untrusted claim until this passes, so nothing is analyzed
  // on behalf of a photo the caller does not own.
  await assertEvidenceAvailable(input.storagePath);
  const signed = await signEvidenceReadUrls([input.storagePath]);
  const imageUrl = signed.get(input.storagePath);
  if (!imageUrl) {
    throw new ApiError(
      502,
      "EVIDENCE_UNREADABLE",
      "Could not open the uploaded photo for analysis.",
    );
  }
  const vision = await analyzeImage(imageUrl);
  const { location, duplicateCandidates } = await enrich(
    input.location,
    vision.issueType,
  );
  return issueAnalysisSchema.parse({
    mode: "live",
    issueType: vision.issueType,
    severity: vision.severity,
    description: vision.observation,
    location,
    imagePath: input.storagePath,
    imageUrl,
    duplicate: { isDuplicate: false, existingIssueId: null, confidence: 0 },
    duplicateCandidates,
    // Jurisdiction is never inferred from an address or a photo. This stays
    // unresolved until resolveAuthority has real boundary data to work from.
    authority: {
      status: "needs_review",
      authority: null,
      reason:
        "Responsibility has not been verified. Jurisdiction boundary data is not connected yet.",
    },
    generatedReport: {
      title: vision.reportTitle,
      description: vision.reportDescription,
      category: vision.issueType,
    },
    // A human still reviews every generated report before it is filed.
    needsReview: true,
  });
}
