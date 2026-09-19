import { z } from "zod";
import { authorityResolutionSchema } from "./authority";
import { submissionSchema } from "./submission";

export const issueTypeSchema = z.enum([
  "pothole",
  "street_light",
  "trash",
  "sidewalk",
  "water_leak",
]);
export const severitySchema = z.enum(["low", "medium", "high"]);
export const issueStatusSchema = z.enum([
  "detected",
  "ready",
  "in_progress",
  "resolved",
]);
export const locationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
});
export const reportSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  category: issueTypeSchema,
});
export const communitySchema = z.object({
  stillThere: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  lastVerifiedAt: z.iso.datetime().nullable(),
});
export const issueSchema = z.object({
  id: z.uuid(),
  type: issueTypeSchema,
  severity: severitySchema,
  location: locationSchema,
  imageUrl: z.url().nullable(),
  report: reportSchema,
  authority: authorityResolutionSchema,
  status: issueStatusSchema,
  community: communitySchema,
  submission: submissionSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const confirmationRequestSchema = z
  .object({
    kind: z.enum(["still_there", "resolved"]),
  })
  .strict();
export type Issue = z.infer<typeof issueSchema>;
export type IssueType = z.infer<typeof issueTypeSchema>;
export type IssueStatus = z.infer<typeof issueStatusSchema>;
export type IssueLocation = z.infer<typeof locationSchema>;
export type GeneratedReport = z.infer<typeof reportSchema>;
export type ConfirmationRequest = z.infer<typeof confirmationRequestSchema>;
