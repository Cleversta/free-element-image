import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Separate development output so production builds do not disrupt the open editor.
export default function nextConfig(phase: string): NextConfig {
  return {
    outputFileTracingIncludes: { "/api/publish": ["./public/assets/**/*"] },
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}
