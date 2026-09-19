import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getVisionModel } from "@/lib/ai/model";
import { ApiError } from "@/lib/api/errors";
import { issueTypeSchema, severitySchema } from "@/schemas/issue";

const TIMEOUT_MS = 30_000;

// Flat rather than a discriminated union: several providers reject a top-level
// anyOf in structured output. The narrowing happens in readVisionResult.
const visionOutputSchema = z.object({
  usable: z.boolean(),
  unusableReason: z.string().nullable(),
  issueType: issueTypeSchema.nullable(),
  severity: severitySchema.nullable(),
  observation: z.string().max(4000).nullable(),
  reportTitle: z.string().max(160).nullable(),
  reportDescription: z.string().max(4000).nullable(),
});

export type VisionAnalysis = {
  issueType: z.infer<typeof issueTypeSchema>;
  severity: z.infer<typeof severitySchema>;
  observation: string;
  reportTitle: string;
  reportDescription: string;
};

const SYSTEM_PROMPT = `You classify photographs of public infrastructure problems for a civic reporting tool. A resident took the photo; a city worker will read your output.

Describe only what is visible in the image. Specifically, never state or estimate:
- measurements such as depth, width, or area, unless a ruler or clearly identifiable reference object appears in the frame
- how long the problem has existed, when it appeared, or whether it is getting worse
- accidents, injuries, complaints, or repair history
- which agency, department, or level of government is responsible
- anything about identifiable people or vehicle number plates that happen to appear

Choose severity from what the image shows about risk to people passing by, and say in the description what made you choose it.

Use the issueType that fits best. When the photo does show a genuine problem in a public space but none of the specific categories describes it, choose "other" and name the actual problem in the title and description. Never refuse a real problem for lack of a matching category.

Set usable to false, fill unusableReason, and leave every other field null only when there is nothing to report: the photo shows no problem at all, is too dark or blurred to judge, or has a person as its subject. A photo that is merely imperfect is still usable; say what is uncertain in the description instead.

When usable is true, write reportTitle as a short specific line naming the problem and where it appears in the scene, and reportDescription as a factual paragraph a city worker could act on. Do not address anyone by name, do not promise a response time, and do not claim the report has been filed.`;

function readVisionResult(
  output: z.infer<typeof visionOutputSchema>,
): VisionAnalysis {
  if (!output.usable) {
    throw new ApiError(
      422,
      "PHOTO_NOT_USABLE",
      output.unusableReason?.trim() ||
        "This photo does not show a reportable street problem clearly enough to analyze.",
    );
  }
  const { issueType, severity, observation, reportTitle, reportDescription } =
    output;
  // usable: true with missing fields is a malformed answer, not a report.
  if (
    !issueType ||
    !severity ||
    !observation?.trim() ||
    !reportTitle?.trim() ||
    !reportDescription?.trim()
  ) {
    throw new ApiError(
      502,
      "ANALYSIS_INCOMPLETE",
      "Image analysis returned an incomplete result.",
    );
  }
  return {
    issueType,
    severity,
    observation: observation.trim(),
    reportTitle: reportTitle.trim(),
    reportDescription: reportDescription.trim(),
  };
}

export async function analyzeImage(imageUrl: string): Promise<VisionAnalysis> {
  let output;
  try {
    const result = await generateText({
      model: getVisionModel(),
      output: Output.object({ schema: visionOutputSchema }),
      system: SYSTEM_PROMPT,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this photo of a possible street or public infrastructure problem.",
            },
            { type: "image", image: new URL(imageUrl) },
          ],
        },
      ],
    });
    output = result.output;
  } catch (error) {
    // Unlike geocoding, this cannot degrade: without it there is no analysis
    // to review, and inventing one would pass a guess off as image evidence.
    console.error("Streetwise image analysis failed", error);
    throw new ApiError(
      502,
      "ANALYSIS_FAILED",
      "Could not analyze this photo. Try again.",
    );
  }
  return readVisionResult(output);
}
