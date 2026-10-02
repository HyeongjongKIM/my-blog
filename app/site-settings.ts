import { cache } from "react";
import { reader } from "./reader";
import keystaticConfig from "@/keystatic.config";

type SiteSettings = {
  title: string;
  tagline: string;
  metaDescription: string;
};

export function resolveSiteSettings(
  settings: Partial<SiteSettings> | null,
): SiteSettings {
  const { title, tagline, metaDescription } =
    keystaticConfig.singletons.siteSettings.schema;

  return {
    title: settings?.title?.trim() || title.defaultValue(),
    tagline: settings?.tagline?.trim() || tagline.defaultValue(),
    metaDescription:
      settings?.metaDescription?.trim() || metaDescription.defaultValue(),
  };
}

export const getSiteSettings = cache(async () =>
  resolveSiteSettings(await reader.singletons.siteSettings.read()),
);
