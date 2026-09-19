import "server-only";
import { ApiError } from "@/lib/api/errors";

export function requireDemoMode() {
  const mode = process.env.STREETWISE_MODE ?? "demo";
  if (mode !== "demo") {
    throw new ApiError(
      503,
      "LIVE_MODE_NOT_IMPLEMENTED",
      "Only demo mode is implemented. Live service integration is a separate development step.",
    );
  }
}

export function requiredServerEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new ApiError(
      503,
      "SERVICE_NOT_CONFIGURED",
      `Missing server configuration: ${name}.`,
    );
  return value;
}
