import { z } from "zod";

// Contract for requesting a direct-to-Storage upload slot before analysis.
// The client PUTs the file to `uploadUrl`, then calls /api/issues/analyze
// with mode "live" and the returned `storagePath`.
export const acceptedImageTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const uploadRequestSchema = z
  .object({
    contentType: acceptedImageTypeSchema,
    sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  })
  .strict();
export const uploadResponseSchema = z.object({
  storagePath: z.string().min(1),
  uploadUrl: z.url(),
  token: z.string().min(1),
});
export type AcceptedImageType = z.infer<typeof acceptedImageTypeSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
