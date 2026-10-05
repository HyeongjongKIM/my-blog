import { makeRouteHandler } from "@keystatic/next/route-handler";
import keystaticConfig from "../../../../keystatic.config";
import { reader } from "../../../reader";
import { resolvePostImageSettings } from "../../../../lib/post-image-settings";
import {
  optimizePostImageRequest,
  PostImageSizeError,
} from "../../../../lib/optimize-post-images";

const handlers = makeRouteHandler({
  config: keystaticConfig,
});

export const GET = handlers.GET;

export async function POST(request: Request) {
  try {
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
    throw error;
  }
}
