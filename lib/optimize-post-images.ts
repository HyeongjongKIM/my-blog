import sharp from "sharp";
import {
  resolvePostImageSettings,
  type PostImageSettings,
} from "./post-image-settings";

export async function optimizePostImage(
  path: string,
  contents: string,
  settings: PostImageSettings = resolvePostImageSettings(null),
): Promise<string> {
  if (
    !/^public\/images\/posts\/(?!.*(?:^|\/)\.\.(?:\/|$)).+\.(?:jpe?g|png|webp|gif|svg|avif)$/i.test(
      path,
    )
  ) {
    return contents;
  }

  const original = Buffer.from(contents, "base64url");
  let smallest: Buffer = original;
  try {
    const metadata = await sharp(original).metadata();
    if ((metadata.pages ?? 1) > 1) {
      return enforceImageLimit(path, original, contents, settings.maxBytes);
    }
    if (!["jpeg", "png", "webp"].includes(metadata.format)) {
      return enforceImageLimit(path, original, contents, settings.maxBytes);
    }
    for (const scale of [1, 5 / 6, 2 / 3, 1 / 2, 1 / 3]) {
      const size = Math.max(1, Math.floor(settings.maxDimension * scale));
      for (const quality of [82, 72, 62]) {
        const image = sharp(original).rotate().resize({
          width: size,
          height: size,
          fit: "inside",
          withoutEnlargement: true,
        });
        let optimized: Buffer;
        if (metadata.format === "jpeg") {
          optimized = await image.jpeg({ quality, mozjpeg: true }).toBuffer();
        } else if (metadata.format === "png") {
          // Keep PNG pixels lossless; reduce dimensions if compression is insufficient.
          optimized = await image.png({ compressionLevel: 9 }).toBuffer();
        } else {
          optimized = await image.webp({ quality }).toBuffer();
        }
        if (optimized.length < smallest.length) smallest = optimized;
        if (smallest.length <= settings.maxBytes) {
          return smallest === original
            ? contents
            : smallest.toString("base64url");
        }
        if (metadata.format === "png") break;
      }
    }
  } catch (error) {
    if (error instanceof PostImageSizeError) throw error;
    // Preserve undecodable uploads only when they are within the size limit.
  }
  return enforceImageLimit(
    path,
    smallest,
    smallest === original ? contents : smallest.toString("base64url"),
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
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
  });
}
