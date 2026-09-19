import { z } from "zod";
import { apiErrorSchema } from "@/schemas/api";

export async function apiFetch<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new Error(
      parsed.success
        ? parsed.data.error.message
        : "Request failed. Please try again.",
    );
  }
  return schema.parse(body);
}
