import {
  optimizePostImage,
  PostImageSizeError,
  ImageOptimizerError,
} from "@/lib/optimize-post-images";

export async function POST(request: Request) {
  // Only the local administrator calls this API; it never writes files or commits.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response("Invalid origin", { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return new Response("Expected JSON", { status: 415 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const { additions, settings } = body ?? {};
  if (
    !Array.isArray(additions) ||
    additions.some(
      (addition) =>
        typeof addition?.path !== "string" ||
        typeof addition?.contents !== "string",
    ) ||
    !Number.isInteger(settings?.maxBytes) ||
    settings.maxBytes < 1024 ||
    settings.maxBytes > 10240 * 1024 ||
    !Number.isInteger(settings?.maxDimension) ||
    settings.maxDimension < 64 ||
    settings.maxDimension > 8192
  )
    return new Response("Invalid image optimization request", { status: 400 });
  try {
    const optimized = [];
    for (const addition of additions) {
      optimized.push({
        path: addition.path,
        contents: await optimizePostImage(
          addition.path,
          addition.contents,
          settings,
        ),
      });
    }
    return Response.json({ additions: optimized });
  } catch (error) {
    if (error instanceof PostImageSizeError)
      return new Response(error.message, { status: 413 });
    if (error instanceof ImageOptimizerError)
      return new Response(error.message, { status: error.status });
    throw error;
  }
}
