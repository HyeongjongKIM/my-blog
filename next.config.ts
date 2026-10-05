import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    allowedDevOrigins: ["127.0.0.1"],
    output: isDevelopment ? undefined : "export",
    // Keystatic treats a trailing slash as an extra route segment.
    trailingSlash: !isDevelopment,
    images: { unoptimized: !isDevelopment },
    // Only the local dev server exposes the administrator and authentication API.
    pageExtensions: [
      "ts",
      "tsx",
      ...(isDevelopment ? ["admin.ts", "admin.tsx"] : []),
    ],
  };
}
