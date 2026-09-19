import { z } from "zod";
import { issueSchema } from "./issue";
import { issueAnalysisSchema } from "./analysis";
import { submissionResultSchema } from "./submission";
import { uploadResponseSchema } from "./upload";

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
const meta = z.object({ mode: z.enum(["demo", "live"]) });
export const issuesResponseSchema = z.object({
  data: z.array(issueSchema),
  meta,
});
export const issueResponseSchema = z.object({ data: issueSchema, meta });
export const analysisResponseSchema = z.object({
  data: issueAnalysisSchema,
  meta,
});
export const submissionResponseSchema = z.object({
  data: submissionResultSchema,
  meta,
});
export const uploadApiResponseSchema = z.object({
  data: uploadResponseSchema,
  meta,
});
