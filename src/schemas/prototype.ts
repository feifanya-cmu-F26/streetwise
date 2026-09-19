import { z } from "zod";
import { issueTypeSchema, locationSchema, reportSchema } from "./issue";

export const workflowStageSchema = z.enum([
  "analyzing",
  "routing",
  "preparing",
  "awaiting_review",
  "sending",
  "submitted",
  "paused",
  "needs_help",
  "tracking",
  "resolved",
]);
export const prototypeSubmissionSchema = z.object({
  id: z.uuid(),
  mode: z.literal("demo"),
  title: z.string(),
  type: issueTypeSchema,
  photo: z.string(),
  description: z.string(),
  location: locationSchema,
  report: reportSchema,
  stage: workflowStageSchema,
  resumeStage: workflowStageSchema.nullable(),
  stageStartedAt: z.number(),
  simulatedGovernmentStatus: z.enum([
    "not_submitted",
    "submitted",
    "in_progress",
    "resolved",
  ]),
  approved: z.boolean(),
  receipt: z.string().nullable(),
  checks: z.number().int().nonnegative(),
  lastCheckedAt: z.number().nullable(),
  autoTrack: z.boolean(),
  trackingInterval: z.number().min(15000),
  createdAt: z.number(),
  correction: z.string(),
  events: z.array(z.object({ at: z.number(), text: z.string() })),
});
export const prototypeStateSchema = z.object({
  version: z.literal(1),
  submissions: z.array(prototypeSubmissionSchema),
  observations: z.record(
    z.string(),
    z.object({ stillThere: z.number(), resolved: z.number() }),
  ),
});
export type WorkflowStage = z.infer<typeof workflowStageSchema>;
export type PrototypeSubmission = z.infer<typeof prototypeSubmissionSchema>;
export type PrototypeState = z.infer<typeof prototypeStateSchema>;
