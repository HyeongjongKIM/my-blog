import { describe, expect, it } from "vitest";
import { resolvePostImageSettings } from "./post-image-settings";

describe("post image settings", () => {
  it("uses schema defaults for existing or unsaved settings", () => {
    expect(resolvePostImageSettings(null)).toEqual({
      maxBytes: 512000,
      maxDimension: 1920,
    });
    expect(resolvePostImageSettings({})).toEqual(
      resolvePostImageSettings(null),
    );
  });

  it("converts the saved KiB limit to bytes and uses the saved dimension", () => {
    expect(
      resolvePostImageSettings({
        imageMaxSizeKiB: 200,
        imageMaxDimension: 1200,
      }),
    ).toEqual({ maxBytes: 204800, maxDimension: 1200 });
  });

  it("falls back for empty, out-of-range, or fractional values", () => {
    for (const settings of [
      { imageMaxSizeKiB: null, imageMaxDimension: null },
      { imageMaxSizeKiB: 0, imageMaxDimension: 0 },
      { imageMaxSizeKiB: 10241, imageMaxDimension: 8193 },
      { imageMaxSizeKiB: 1.5, imageMaxDimension: 64.5 },
    ]) {
      expect(resolvePostImageSettings(settings)).toEqual(
        resolvePostImageSettings(null),
      );
    }
  });
});
