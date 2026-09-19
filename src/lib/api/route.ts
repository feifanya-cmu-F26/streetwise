import "server-only";
import { z } from "zod";
import { ApiError } from "./errors";

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send an application/json request body.",
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function demoResponse<T>(data: T, status = 200) {
  return Response.json(
    { data, meta: { mode: "demo" } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function apiRoute(
  work: () => Promise<Response>,
): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    const known =
      error instanceof ApiError
        ? error
        : error instanceof z.ZodError
          ? new ApiError(
              400,
              "VALIDATION_ERROR",
              error.issues
                .map(
                  (issue) =>
                    `${issue.path.join(".") || "body"}: ${issue.message}`,
                )
                .join("; "),
            )
          : new ApiError(
              500,
              "INTERNAL_ERROR",
              "The request could not be completed.",
            );
    if (known.status === 500) console.error("Streetwise API error", error);
    return Response.json(
      { error: { code: known.code, message: known.message } },
      { status: known.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function issueIdFrom(context: {
  params: Promise<{ id: string }>;
}) {
  return z.uuid().parse((await context.params).id);
}
