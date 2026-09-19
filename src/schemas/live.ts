import { z } from "zod";
import { locationSchema, reportSchema } from "./issue";
import { issueAnalysisSchema } from "./analysis";
export const authorityIdSchema = z.enum([
  "mountain_view",
  "santa_clara_county",
  "caltrans",
]);
export const liveStageSchema = z.enum([
  "queued_analysis",
  "analyzing",
  "review",
  "queued_prepare",
  "preparing",
  "ready",
  "paused",
  "needs_input",
  "queued_submit",
  "submitting",
  "uncertain",
  "submitted",
  "queued_track",
  "tracking",
  "queued_verify",
  "verifying",
  "failed",
]);
export const contactSchema = z.object({
  email: z.union([z.literal(""), z.email().max(254)]).default(""),
  publishPhoto: z.boolean().optional(),
  portalReplyMode: z.enum(["account", "anonymous"]).optional(),
  name: z.string().trim().max(100).default(""),
  phone: z.string().trim().max(40).default(""),
});
export const liveReportSchema = z.object({
  id: z.uuid(),
  owner_id: z.uuid(),
  issue_id: z.uuid().nullable(),
  storage_path: z.string(),
  location: locationSchema,
  description: z.string(),
  analysis: issueAnalysisSchema.nullable(),
  report: reportSchema.nullable(),
  authority_id: authorityIdSchema.nullable(),
  contact: contactSchema.nullable(),
  stage: liveStageSchema,
  checkpoint: z.number().int(),
  session_id: z.string().nullable(),
  message: z.string(),
  correction: z.string().nullable(),
  receipt: z
    .object({
      id: z.string(),
      url: z.url().nullable(),
      status: z.string(),
      evidence: z.string(),
    })
    .nullable(),
  attempts: z.number().int(),
  lease_until: z.string().nullable(),
  next_run_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  last_tracked_at: z.string().nullable(),
  tracking_supported: z.boolean().nullable(),
});
export const newLiveReportSchema = z
  .object({
    id: z.uuid(),
    storagePath: z.string().min(1).max(500),
    location: locationSchema,
    description: z.string().trim().max(4000).default(""),
  })
  .strict();
export const approveReportSchema = z
  .object({
    report: reportSchema,
    // Omit both to use the server's persisted automatic resolution.
    authorityId: authorityIdSchema.optional(),
    authorityConfirmed: z.literal(true).optional(),
    duplicatesReviewed: z.literal(true),
    publishConfirmed: z.literal(true),
    publishPhotoConfirmed: z.literal(true).optional(),
    contact: contactSchema.pick({ email: true, name: true, phone: true }).strict(),
  })
  .strict();
export const reportActionSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("approve"), ...approveReportSchema.shape })
    .strict(),
  z
    .object({
      action: z.literal("pause"),
      reason: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z.object({ action: z.enum(["resume", "retry", "track"]) }).strict(),
  z
    .object({
      action: z.literal("submit"),
      confirmedRealReport: z.literal(true),
      confirmedReviewedForm: z.literal(true),
    })
    .strict(),
  z.object({ action: z.literal("verify_receipt") }).strict(),
  z.object({ action: z.literal("portal_mode"), mode: z.enum(["account", "anonymous"]) }).strict(),
]);
export type LiveReport = z.infer<typeof liveReportSchema>;
export type LiveStage = z.infer<typeof liveStageSchema>;
export type ReportAction = z.infer<typeof reportActionSchema>;
