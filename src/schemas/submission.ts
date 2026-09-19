import { z } from "zod";

export const submissionStatusSchema = z.enum([
  "not_submitted",
  "submitted",
  "acknowledged",
  "in_progress",
  "resolved",
  "failed",
]);
export const submissionSchema = z.object({
  status: submissionStatusSchema,
  externalRequestId: z.string().nullable(),
  externalStatusUrl: z.url().nullable(),
});
export const submissionRequestSchema = z
  .object({
    mode: z.literal("demo"),
    reviewed: z.literal(true),
  })
  .strict();
export const submissionResultSchema = z.object({
  mode: z.literal("demo"),
  issueId: z.uuid(),
  status: z.literal("prepared"),
  submittedToGovernment: z.literal(false),
  message: z.string(),
});
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type SubmissionResult = z.infer<typeof submissionResultSchema>;
