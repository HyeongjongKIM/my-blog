import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;

  const isAdminWorker = process.env.KEYSTATIC_ADMIN_WORKER === "1";
  const includeAdmin = isDevelopment || isAdminWorker;

  return {
    allowedDevOrigins: ["127.0.0.1"],
    output: isDevelopment || isAdminWorker ? undefined : "export",
    // Keystatic treats a trailing slash as an extra route segment.
    trailingSlash: !includeAdmin,
    ...(isAdminWorker
      ? {
          redirects: async () => [
            { source: "/", destination: "/keystatic", permanent: false },
          ],
        }
      : {}),
    images: { unoptimized: true },
    // Keep blog pages out of the administrator deployment.
    pageExtensions: [
      "ts",
      "tsx",
      ...(!isAdminWorker ? ["blog.tsx"] : []),
      ...(includeAdmin ? ["admin.ts", "admin.tsx"] : []),
    ],
  };
}
