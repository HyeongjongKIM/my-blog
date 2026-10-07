import { makeRouteHandler } from "@keystatic/next/route-handler";
import keystaticConfig from "../../../../keystatic.config";
import { resolvePostImageSettings } from "../../../../lib/post-image-settings";
import {
  optimizePostImageRequest,
  PostImageSizeError,
  ImageOptimizerError,
} from "../../../../lib/optimize-post-images";

// Next.js imports routes while building. GitHub secrets exist only at runtime.
function getHandlers() {
  return makeRouteHandler({ config: keystaticConfig });
}

export async function GET(request: Request) {
  return getHandlers().GET(request);
}

export async function POST(request: Request) {
  const handlers = getHandlers();
  if (keystaticConfig.storage.kind !== "local") {
    return handlers.POST(request);
  }

  try {
    const { reader } = await import("../../../reader");
    const settings = resolvePostImageSettings(
      await reader.singletons.siteSettings.read(),
    );
    return await handlers.POST(
      await optimizePostImageRequest(request, settings),
    );
  } catch (error) {
    if (error instanceof PostImageSizeError) {
      return new Response(error.message, { status: 413 });
    }
    if (error instanceof ImageOptimizerError)
      return new Response(error.message, { status: error.status });
    throw error;
  }
}
