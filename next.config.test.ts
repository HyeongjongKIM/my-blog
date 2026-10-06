import { describe, expect, it } from "vitest";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";
import { createValidFileMatcher } from "next/dist/server/lib/find-page-file";
import nextConfig from "./next.config";

describe("administrator route isolation", () => {
  it("recognizes the administrator and API only in development", () => {
    for (const phase of [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD]) {
      const config = nextConfig(phase);
      const matcher = createValidFileMatcher(config.pageExtensions!, undefined);
      const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;

      expect(matcher.isAppRouterPage("page.admin.tsx")).toBe(isDevelopment);
      expect(matcher.isAppRouterRoute("route.admin.ts")).toBe(isDevelopment);
      expect(matcher.isAppRouterPage("page.tsx")).toBe(true);
    }
  });

  it("keeps local setup URLs free of trailing route segments", () => {
    expect(nextConfig(PHASE_DEVELOPMENT_SERVER).trailingSlash).toBe(false);
    expect(nextConfig(PHASE_PRODUCTION_BUILD).trailingSlash).toBe(true);
  });

  it("exports static assets without a runtime image server", () => {
    const config = nextConfig(PHASE_PRODUCTION_BUILD);
    expect(config.output).toBe("export");
    expect(config.images?.unoptimized).toBe(true);
    expect(nextConfig(PHASE_DEVELOPMENT_SERVER).output).toBeUndefined();
    expect(nextConfig(PHASE_DEVELOPMENT_SERVER).images?.unoptimized).toBe(true);
  });
});
