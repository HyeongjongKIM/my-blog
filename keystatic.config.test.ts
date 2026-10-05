import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Keystatic storage selection", () => {
  it("loads local content without GitHub authentication by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_KEYSTATIC_STORAGE", undefined);
    vi.resetModules();
    const { default: config } = await import("./keystatic.config");
    expect(config.storage).toEqual({ kind: "local" });
  });

  it("uses the same content paths for local and GitHub editing", async () => {
    const paths = [];
    for (const mode of ["local", "github"]) {
      vi.stubEnv("NEXT_PUBLIC_KEYSTATIC_STORAGE", mode);
      vi.resetModules();
      const { default: config } = await import("./keystatic.config");
      expect(config.storage.kind).toBe(mode);
      if (mode === "github") {
        expect(config.storage).toEqual({
          kind: "github",
          repo: "HyeongjongKIM/my-blog",
        });
      }
      paths.push({
        posts: config.collections.posts.path,
        settings: config.singletons.siteSettings.path,
        fields: Object.keys(config.collections.posts.schema),
      });
    }
    expect(paths[0]).toEqual(paths[1]);
  });
});
