import { realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  resolvePostImageSettings,
  type PostImageSettings,
} from "./post-image-settings";

export class ImageOptimizerError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "ImageOptimizerError";
  }
}

// Server-side adapter: the Worker owns decoding, resizing, and compression.
export async function optimizePostImage(
  path: string,
  contents: string,
  settings: PostImageSettings = resolvePostImageSettings(null),
): Promise<string> {
  const match =
    /^public\/images\/(posts|site)\/(?!(?:.*\/)?\.\.(?:\/|$)).+\.(jpe?g|png|webp|gif|svg|avif|ico)$/i.exec(
      path,
    );
  if (!match || (match[1] === "posts" && match[2].toLowerCase() === "ico"))
    return contents;
  if (match[1] === "site")
    settings = { maxBytes: 100 * 1024, maxDimension: 64 };
  const original = Buffer.from(contents, "base64url");
  const extension = match[2].toLowerCase();
  const mime = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  }[extension];
  if (!mime)
    return enforceImageLimit(path, original, contents, settings.maxBytes);

  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(original)], { type: mime }),
    path.split("/").pop(),
  );
  form.set("width", String(settings.maxDimension));
  form.set("height", String(settings.maxDimension));
  form.set("fit", "scale-down");
  form.set("format", "original");
  form.set("maxBytes", String(settings.maxBytes));
  form.set("allowDownsize", "true");
  form.set("minScale", String(1 / 3));
  if (mime !== "image/png") {
    form.set("quality", "82");
    form.set("minQuality", "62");
  }
  let response: Response;
  let diagnosticUrl: string | null = null;
  try {
    const url = new URL(
      "/v1/optimize",
      process.env.IMAGE_OPTIMIZER_API_URL || "http://localhost:8787",
    );
    // Log only the endpoint, never URL credentials, headers, or image data.
    diagnosticUrl = `${url.origin}${url.pathname}`;
    console.info("Image optimizer request", {
      method: "POST",
      url: diagnosticUrl,
    });
    response = await fetch(url, {
      method: "POST",
      body: form,
      headers: process.env.IMAGE_OPTIMIZER_API_KEY
        ? { authorization: `Bearer ${process.env.IMAGE_OPTIMIZER_API_KEY}` }
        : {},
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Image optimizer connection failed", {
      url: diagnosticUrl,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    throw new ImageOptimizerError(
      "Image optimizer is unavailable or timed out. Save was stopped.",
    );
  }
  console.info("Image optimizer response", {
    url: diagnosticUrl,
    status: response.status,
    rayId: response.headers.get("cf-ray"),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (body?.error?.code === "UNSUPPORTED_ANIMATION")
      return enforceImageLimit(path, original, contents, settings.maxBytes);
    if (body?.error?.code === "OUTPUT_TOO_LARGE")
      throw new PostImageSizeError(path, settings.maxBytes);
    throw new ImageOptimizerError(
      `Image optimizer failed (${response.status}). Save was stopped.`,
    );
  }
  if (response.headers.get("content-type")?.split(";")[0] !== mime) {
    throw new ImageOptimizerError(
      "Image optimizer returned an unexpected format. Save was stopped.",
    );
  }
  let bytes: Buffer;
  try {
    bytes = Buffer.from(await response.arrayBuffer());
  } catch {
    throw new ImageOptimizerError(
      "Could not read optimized image. Save was stopped.",
    );
  }
  if (!bytes.length)
    throw new ImageOptimizerError(
      "Image optimizer returned an empty image. Save was stopped.",
    );
  return enforceImageLimit(
    path,
    bytes,
    bytes.toString("base64url"),
    settings.maxBytes,
  );
}

export class PostImageSizeError extends Error {
  constructor(path: string, maxBytes: number) {
    super(
      `Image ${path} exceeds the ${maxBytes / 1024} KiB limit after optimization. Please upload a smaller image.`,
    );
    this.name = "PostImageSizeError";
  }
}

function enforceImageLimit(
  path: string,
  image: Buffer,
  contents: string,
  maxBytes: number,
): string {
  if (image.length > maxBytes) throw new PostImageSizeError(path, maxBytes);
  return contents;
}

export async function optimizePostImageRequest(
  request: Request,
  settings: PostImageSettings = resolvePostImageSettings(null),
): Promise<Request> {
  if (
    !new URL(request.url).pathname.endsWith("/keystatic/update") ||
    request.headers.get("no-cors") !== "1" ||
    request.headers.get("content-type") !== "application/json"
  ) {
    return request;
  }

  let body;
  try {
    body = await request.clone().json();
  } catch {
    return request;
  }
  if (!Array.isArray(body?.additions)) return request;

  // Process sequentially to bound memory usage for large batches of uploads.
  for (const addition of body.additions) {
    if (
      typeof addition?.path === "string" &&
      typeof addition?.contents === "string"
    ) {
      addition.contents = await optimizePostImage(
        addition.path,
        addition.contents,
        settings,
      );
    }
  }
  // Keystatic writes additions before deleting old assets. On a case-insensitive
  // filesystem, favicon.PNG and favicon.png can refer to the same file.
  // Keep deletions for genuinely different files, but never delete a replacement.
  if (Array.isArray(body.deletions)) {
    const replacementPaths = new Set<string>();
    for (const addition of body.additions) {
      if (typeof addition?.path !== "string") continue;
      const existing = await realpath(resolve(addition.path)).catch(() => null);
      if (existing) {
        replacementPaths.add(existing);
        // Preserve the on-disk spelling so Keystatic's case-sensitive tree lookup
        // and the settings reference still agree after a case-only replacement.
        if (addition.path.startsWith("public/images/site/")) {
          const canonicalPath = relative(process.cwd(), existing)
            .split("\\")
            .join("/");
          if (canonicalPath !== addition.path) {
            const settingsFile = body.additions.find(
              (file: { path: string }) =>
                file.path === "src/content/site-settings.json",
            );
            if (settingsFile) {
              const saved = JSON.parse(
                Buffer.from(settingsFile.contents, "base64url").toString(
                  "utf8",
                ),
              );
              if (saved.favicon === addition.path.slice("public".length)) {
                saved.favicon = canonicalPath.slice("public".length);
                settingsFile.contents = Buffer.from(
                  JSON.stringify(saved, null, 2) + "\n",
                ).toString("base64url");
              }
            }
            addition.path = canonicalPath;
          }
        }
      }
    }
    const deletions = [];
    for (const deletion of body.deletions) {
      const existing =
        typeof deletion?.path === "string"
          ? await realpath(resolve(deletion.path)).catch(() => null)
          : null;
      if (!existing || !replacementPaths.has(existing))
        deletions.push(deletion);
    }
    body.deletions = deletions;
  }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
  });
}
