import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@browserbasehq/stagehand"],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@browserbasehq/stagehand/dist/assets/**/*"],
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["10.0.5.108", "*.trycloudflare.com"],
};
export default config;
