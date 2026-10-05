// @vitest-environment node
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanStaticExport } from "./clean-static-export.mjs";

describe("static export cleanup", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "blog-export-test-"));
    mkdirSync(join(root, "out/posts/__empty_blog__"), { recursive: true });
    writeFileSync(join(root, "out/posts/__empty_blog__/index.html"), "404");
    writeFileSync(join(root, "out/index.html"), "Blog");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("removes the fallback page without changing the homepage", () => {
    cleanStaticExport(root);
    expect(existsSync(join(root, "out/posts/__empty_blog__"))).toBe(false);
    expect(existsSync(join(root, "out/index.html"))).toBe(true);
  });

  it("preserves a real post with the same slug", () => {
    mkdirSync(join(root, "src/content/posts"), { recursive: true });
    writeFileSync(join(root, "src/content/posts/__empty_blog__.mdoc"), "Post");
    cleanStaticExport(root);
    expect(existsSync(join(root, "out/posts/__empty_blog__/index.html"))).toBe(
      true,
    );
  });

  it.each(["keystatic", "api/keystatic"])(
    "rejects an export containing the administrator route %s",
    (route) => {
      mkdirSync(join(root, "out", route), { recursive: true });
      expect(() => cleanStaticExport(root)).toThrow("Administrator route");
    },
  );
});
