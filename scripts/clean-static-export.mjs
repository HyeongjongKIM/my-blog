import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function cleanStaticExport(root = process.cwd()) {
  // The empty-blog fallback renders notFound(), but Next.js still exports HTML.
  // Remove it so the static host returns a real 404 instead of serving that HTML.
  if (!existsSync(resolve(root, "src/content/posts/__empty_blog__.mdoc"))) {
    rmSync(resolve(root, "out/posts/__empty_blog__"), {
      recursive: true,
      force: true,
    });
  }

  for (const route of ["keystatic", "api/keystatic"]) {
    if (existsSync(resolve(root, "out", route))) {
      throw new Error(
        `Administrator route was included in the static export: ${route}`,
      );
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  cleanStaticExport();
}
