import "server-only";
import { createGateway } from "ai";
import { requiredServerEnv } from "@/lib/env";

// Configuration seam only; the demo never invokes a model.
export function getVisionModel() {
  const gateway = createGateway({
    apiKey: requiredServerEnv("AI_GATEWAY_API_KEY"),
  });
  return gateway(process.env.AI_GATEWAY_MODEL || "openai/gpt-5.4-mini");
}
