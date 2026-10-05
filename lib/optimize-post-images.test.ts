// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { resolvePostImageSettings } from "./post-image-settings";
const MAX_POST_IMAGE_BYTES = resolvePostImageSettings(null).maxBytes;
import {
  optimizePostImage,
  optimizePostImageRequest,
  PostImageSizeError,
} from "./optimize-post-images";

describe("post image optimization", () => {
  it("applies user dimensions and byte limits to image requests", async () => {
    const image = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: "red" },
    })
      .jpeg({ quality: 100 })
      .toBuffer();
    const request = new Request("http://localhost/api/keystatic/update", {
      method: "POST",
      headers: { "content-type": "application/json", "no-cors": "1" },
      body: JSON.stringify({
        additions: [
          {
            path: "public/images/posts/a.jpg",
            contents: image.toString("base64url"),
          },
        ],
        deletions: [],
      }),
    });
    const result = await optimizePostImageRequest(request, {
      maxBytes: 200 * 1024,
      maxDimension: 800,
    });
    const saved = await result.json();
    const bytes = Buffer.from(saved.additions[0].contents, "base64url");
    expect(await sharp(bytes).metadata()).toMatchObject({
      width: 800,
      height: 400,
    });
    expect(bytes.length).toBeLessThanOrEqual(200 * 1024);
    await expect(
      optimizePostImage(
        "public/images/posts/a.svg",
        Buffer.alloc(2049).toString("base64url"),
        { maxBytes: 2048, maxDimension: 800 },
      ),
    ).rejects.toThrow("2 KiB");
  });
  it("reduces a detailed PNG below the byte limit by resizing", async () => {
    const original = await sharp(randomBytes(1600 * 1600), {
      raw: { width: 1600, height: 1600, channels: 1 },
    })
      .png()
      .toBuffer();
    expect(original.length).toBeGreaterThan(MAX_POST_IMAGE_BYTES);
    const result = Buffer.from(
      await optimizePostImage(
        "public/images/posts/noise.png",
        original.toString("base64url"),
      ),
      "base64url",
    );
    expect(result.length).toBeLessThanOrEqual(MAX_POST_IMAGE_BYTES);
    expect((await sharp(result).metadata()).width).toBeLessThan(1600);
  });

  it("rejects oversized images that cannot be optimized", async () => {
    const contents = Buffer.alloc(MAX_POST_IMAGE_BYTES + 1).toString(
      "base64url",
    );
    for (const path of [
      "public/images/posts/a.jpg",
      "public/images/posts/a.gif",
      "public/images/posts/a.svg",
    ]) {
      await expect(optimizePostImage(path, contents)).rejects.toBeInstanceOf(
        PostImageSizeError,
      );
    }
  });

  it("keeps already small WebP bytes when encoding would make them larger", async () => {
    const image = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: "red" },
    })
      .webp({ lossless: true })
      .toBuffer();
    const contents = image.toString("base64url");
    expect(
      await optimizePostImage("public/images/posts/a.webp", contents),
    ).toBe(contents);
  });
  it("reduces large uploads while preserving format and aspect ratio", async () => {
    const original = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: "red" },
    })
      .jpeg({ quality: 100 })
      .toBuffer();
    const result = Buffer.from(
      await optimizePostImage(
        "public/images/posts/post/photo.jpg",
        original.toString("base64url"),
      ),
      "base64url",
    );
    expect(result.length).toBeLessThan(original.length);
    expect(await sharp(result).metadata()).toMatchObject({
      format: "jpeg",
      width: 1920,
      height: 960,
    });
  });

  it("preserves PNG transparency and does not enlarge small images", async () => {
    const original = await sharp({
      create: {
        width: 32,
        height: 16,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const result = Buffer.from(
      await optimizePostImage(
        "public/images/posts/a.png",
        original.toString("base64url"),
      ),
      "base64url",
    );
    expect(result.length).toBeLessThanOrEqual(original.length);
    expect(await sharp(result).metadata()).toMatchObject({
      width: 32,
      height: 16,
      hasAlpha: true,
      format: "png",
    });
  });

  it("preserves non-post files, unsupported formats, and invalid images", async () => {
    for (const path of [
      "src/content/posts/a.mdoc",
      "public/images/posts/a.gif",
      "public/images/posts/a.svg",
      "public/images/posts/../a.jpg",
      "public/images/posts/a.jpg",
    ]) {
      expect(await optimizePostImage(path, "invalid")).toBe("invalid");
    }
  });

  it("transforms only image additions and preserves deletions and request headers", async () => {
    const image = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: "red" },
    })
      .jpeg({ quality: 100 })
      .toBuffer();
    const body = {
      additions: [
        {
          path: "public/images/posts/a.jpg",
          contents: image.toString("base64url"),
        },
        { path: "src/content/posts/a.mdoc", contents: "text" },
      ],
      deletions: [{ path: "public/images/posts/old.webp" }],
    };
    const request = new Request("http://localhost/api/keystatic/update", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "no-cors": "1",
        cookie: "test=1",
      },
      body: JSON.stringify(body),
    });
    const result = await optimizePostImageRequest(request);
    const saved = await result.json();
    expect(saved.deletions).toEqual(body.deletions);
    expect(saved.additions[1]).toEqual(body.additions[1]);
    expect(
      await sharp(
        Buffer.from(saved.additions[0].contents, "base64url"),
      ).metadata(),
    ).toMatchObject({ format: "jpeg", width: 1920 });
    expect(result.headers.get("cookie")).toBe("test=1");
  });

  it("leaves malformed requests for Keystatic to validate", async () => {
    const request = new Request("http://localhost/api/keystatic/update", {
      method: "POST",
      headers: { "content-type": "application/json", "no-cors": "1" },
      body: "{",
    });
    expect(await optimizePostImageRequest(request)).toBe(request);
    expect(await request.text()).toBe("{");
  });
});
