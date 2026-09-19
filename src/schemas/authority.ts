import { z } from "zod";

export const authoritySchema = z.object({
  id: z.enum(["mountain_view", "santa_clara_county", "caltrans"]),
  name: z.string().min(1),
  department: z.string().min(1),
  submissionUrl: z.url().nullable(),
});
export const authorityResolutionSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("resolved"),
    authority: authoritySchema,
    reason: z.string(),
  }),
  z.object({
    status: z.literal("needs_review"),
    authority: z.null(),
    reason: z.string(),
  }),
]);
export type Authority = z.infer<typeof authoritySchema>;
export type AuthorityResolution = z.infer<typeof authorityResolutionSchema>;
