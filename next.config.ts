import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    // Only the local dev server exposes the administrator and authentication API.
    pageExtensions: [
      "ts",
      "tsx",
      ...(phase === PHASE_DEVELOPMENT_SERVER ? ["admin.ts", "admin.tsx"] : []),
    ],
  };
}
