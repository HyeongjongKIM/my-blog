import { describe, expect, it } from "vitest";
import { resolveSiteSettings } from "./site-settings";

describe("resolveSiteSettings", () => {
  it("uses the Keystatic defaults before the singleton is saved", () => {
    expect(resolveSiteSettings(null)).toEqual({
      favicon: null,
      title: "My Blog",
      tagline: "Thoughts, notes, and stories.",
      metaDescription: "A personal blog for thoughts, notes, and stories.",
    });
  });

  it("uses saved settings across the blog", () => {
    expect(
      resolveSiteSettings({
        title: "  Kim's Notes  ",
        tagline: "  Notes on making things.  ",
        metaDescription: "  Writing about design and code.  ",
      }),
    ).toEqual({
      favicon: null,
      title: "Kim's Notes",
      tagline: "Notes on making things.",
      metaDescription: "Writing about design and code.",
    });
  });
  it("reads the uploaded favicon and falls back after removal", () => {
    expect(
      resolveSiteSettings({ favicon: "/images/site/favicon.png" }).favicon,
    ).toBe("/images/site/favicon.png");
    expect(resolveSiteSettings({ favicon: null }).favicon).toBeNull();
  });
});
