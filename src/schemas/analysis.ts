import { z } from "zod";
import { authorityResolutionSchema } from "./authority";
import {
  issueTypeSchema,
  locationSchema,
  reportSchema,
  severitySchema,
} from "./issue";

// Demo input stays explicit and mock. Live input references an evidence photo
// already placed in Storage by the /api/issues/upload flow (src/schemas/upload.ts).
const demoAnalyzeRequestSchema = z
  .object({
    mode: z.literal("demo"),
    demoIssueType: issueTypeSchema,
    location: locationSchema,
  })
  .strict();
const liveAnalyzeRequestSchema = z
  .object({
    mode: z.literal("live"),
    storagePath: z.string().min(1),
    location: locationSchema,
  })
  .strict();
export const analyzeRequestSchema = z.discriminatedUnion("mode", [
  demoAnalyzeRequestSchema,
  liveAnalyzeRequestSchema,
]);
export const duplicateSchema = z.discriminatedUnion("isDuplicate", [
  z.object({
    isDuplicate: z.literal(false),
    existingIssueId: z.null(),
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    isDuplicate: z.literal(true),
    existingIssueId: z.uuid(),
    confidence: z.number().min(0).max(1),
  }),
]);
export const issueAnalysisSchema = z.object({
  mode: z.enum(["demo", "live"]),
  issueType: issueTypeSchema,
  severity: severitySchema,
  description: z.string().min(1).max(4000),
  location: locationSchema,
  imageUrl: z.url().nullable(),
  duplicate: duplicateSchema,
  authority: authorityResolutionSchema,
  generatedReport: reportSchema,
  needsReview: z.boolean(),
});
export const createIssueRequestSchema = z
  .object({
    analysis: issueAnalysisSchema,
    report: reportSchema,
  })
  .strict()
  .superRefine(({ analysis, report }, ctx) => {
    if (analysis.issueType !== report.category) {
      ctx.addIssue({
        code: "custom",
        path: ["report", "category"],
        message: "Category must match the analyzed issue type.",
      });
    }
  });
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type DemoAnalyzeRequest = z.infer<typeof demoAnalyzeRequestSchema>;
export type IssueAnalysis = z.infer<typeof issueAnalysisSchema>;
export type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>;
