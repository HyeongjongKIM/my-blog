// @vitest-environment node
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  optimizePostImage,
  optimizePostImageRequest,
  PostImageSizeError,
} from "./optimize-post-images";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const path = "public/images/posts/photo.png";
const source = Buffer.from("source").toString("base64url");
const settings = { maxBytes: 2048, maxDimension: 800 };
function mockWorker(type = "image/png", bytes = "optimized") {
  const worker = vi.fn<typeof fetch>(
    async () => new Response(bytes, { headers: { "content-type": type } }),
  );
  vi.stubGlobal("fetch", worker);
  return worker;
}

describe("Worker image adapter", () => {
  it("maps settings to multipart without PNG quality and preserves the filename", async () => {
    const worker = mockWorker();
    vi.stubEnv("IMAGE_OPTIMIZER_API_URL", "http://localhost:8787/");
    vi.stubEnv("IMAGE_OPTIMIZER_API_KEY", "worker-token");
    expect(await optimizePostImage(path, source, settings)).toBe(
      Buffer.from("optimized").toString("base64url"),
    );
    const [url, init] = worker.mock.calls[0];
    expect(String(url)).toBe("http://localhost:8787/v1/optimize");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer worker-token",
    );
    const form = init!.body as FormData;
    expect(form.get("width")).toBe("800");
    expect(form.get("height")).toBe("800");
    expect(form.get("maxBytes")).toBe("2048");
    expect(form.get("format")).toBe("original");
    expect(form.has("quality")).toBe(false);
    expect((form.get("image") as File).name).toBe("photo.png");
  });
  it("sets lossy quality and fixed favicon limits", async () => {
    const worker = mockWorker("image/jpeg");
    await optimizePostImage("public/images/site/favicon.jpg", source, settings);
    const form = worker.mock.calls[0][1]!.body as FormData;
    expect(form.get("quality")).toBe("82");
    expect(form.get("minQuality")).toBe("62");
    expect(form.get("width")).toBe("64");
    expect(form.get("maxBytes")).toBe("102400");
  });
  it("preserves unsupported formats within the limit and skips unrelated paths", async () => {
    const worker = mockWorker();
    for (const file of [
      "public/images/posts/a.svg",
      "public/images/posts/a.gif",
      "public/images/site/a.ico",
      "public/images/posts/../a.png",
      "post.mdoc",
    ]) {
      expect(await optimizePostImage(file, source, settings)).toBe(source);
    }
    expect(worker).not.toHaveBeenCalled();
    await expect(
      optimizePostImage(
        "public/images/posts/a.svg",
        Buffer.alloc(3000).toString("base64url"),
        settings,
      ),
    ).rejects.toBeInstanceOf(PostImageSizeError);
  });
  it("preserves animation only when the Worker explicitly rejects animation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { code: "UNSUPPORTED_ANIMATION" } },
          { status: 415 },
        ),
      ),
    );
    expect(await optimizePostImage(path, source, settings)).toBe(source);
  });
  it("stops saves for API failures, outages, wrong formats, and oversized results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: { code: "OUTPUT_TOO_LARGE" } }, { status: 422 }),
      ),
    );
    await expect(
      optimizePostImage(path, source, settings),
    ).rejects.toBeInstanceOf(PostImageSizeError);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("failure", { status: 401 })),
    );
    await expect(optimizePostImage(path, source, settings)).rejects.toThrow(
      "failed (401)",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(optimizePostImage(path, source, settings)).rejects.toThrow(
      "unavailable",
    );
    mockWorker("image/webp");
    await expect(optimizePostImage(path, source, settings)).rejects.toThrow(
      "unexpected format",
    );
    mockWorker("image/png", "x".repeat(3000));
    await expect(
      optimizePostImage(path, source, settings),
    ).rejects.toBeInstanceOf(PostImageSizeError);
  });
  it("replaces only image additions and preserves deletions and headers in local updates", async () => {
    mockWorker();
    const body = {
      additions: [
        { path, contents: source },
        { path: "post.mdoc", contents: source },
      ],
      deletions: [{ path: "old.png" }],
    };
    const request = new Request("http://localhost/api/keystatic/update", {
      method: "POST",
      headers: {
        "no-cors": "1",
        "content-type": "application/json",
        "x-test": "keep",
      },
      body: JSON.stringify(body),
    });
    const result = await optimizePostImageRequest(request, settings);
    expect(result.headers.get("x-test")).toBe("keep");
    expect(await result.json()).toEqual({
      ...body,
      additions: [
        { path, contents: Buffer.from("optimized").toString("base64url") },
        body.additions[1],
      ],
    });
    const other = new Request("http://localhost/api/keystatic/read");
    expect(await optimizePostImageRequest(other)).toBe(other);
  });
});

describe("local asset replacement", () => {
  it("keeps favicon settings aligned with the on-disk filename after case-only replacement", async () => {
    mockWorker();
    await mkdir("public/images/site", { recursive: true });
    const directory = await mkdtemp("public/images/site/replacement-test-");
    try {
      const originalPath = `${directory}/favicon.png`;
      const replacementPath = `${directory}/favicon.PNG`;
      await writeFile(originalPath, "original");
      const sameFile =
        (await realpath(replacementPath).catch(() => null)) ===
        (await realpath(originalPath));
      const settingsFile = {
        path: "src/content/site-settings.json",
        contents: Buffer.from(
          JSON.stringify({
            title: "Keep title",
            favicon: replacementPath.slice(6),
          }),
        ).toString("base64url"),
      };
      const request = new Request("http://localhost/api/keystatic/update", {
        method: "POST",
        headers: { "no-cors": "1", "content-type": "application/json" },
        body: JSON.stringify({
          additions: [
            settingsFile,
            { path: replacementPath, contents: source },
          ],
          deletions: [{ path: originalPath }],
        }),
      });
      const result = await optimizePostImageRequest(request);
      const updates = await result.json();
      const saved = JSON.parse(
        Buffer.from(updates.additions[0].contents, "base64url").toString(),
      );
      expect(saved).toEqual({
        title: "Keep title",
        favicon: (sameFile ? originalPath : replacementPath).slice(6),
      });
      expect(updates.additions[1].path).toBe(
        sameFile ? originalPath : replacementPath,
      );
      expect(updates.deletions).toEqual(
        sameFile ? [] : [{ path: originalPath }],
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("does not delete the replacement when differently cased paths resolve to the same file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "keystatic-replacement-"));
    try {
      const originalPath = join(directory, "favicon.png");
      const replacementPath = join(directory, "favicon.PNG");
      const unrelatedPath = join(directory, "old.svg");
      await writeFile(originalPath, "old");
      await writeFile(unrelatedPath, "old icon");
      const sameFile =
        (await realpath(replacementPath).catch(() => null)) ===
        (await realpath(originalPath));
      const request = new Request("http://localhost/api/keystatic/update", {
        method: "POST",
        headers: { "no-cors": "1", "content-type": "application/json" },
        body: JSON.stringify({
          additions: [
            {
              path: replacementPath,
              contents: Buffer.from("new").toString("base64url"),
            },
          ],
          deletions: [{ path: originalPath }, { path: unrelatedPath }],
        }),
      });
      const result = await optimizePostImageRequest(request);
      const updates = await result.json();
      expect(updates.deletions).toEqual(
        sameFile
          ? [{ path: unrelatedPath }]
          : [{ path: originalPath }, { path: unrelatedPath }],
      );
      // Reproduce the installed Keystatic handler's write-then-delete ordering.
      for (const addition of updates.additions)
        await writeFile(
          addition.path,
          Buffer.from(addition.contents, "base64url"),
        );
      for (const deletion of updates.deletions)
        await rm(deletion.path, { force: true });
      expect(await readFile(replacementPath, "utf8")).toBe("new");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
