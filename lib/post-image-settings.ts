import keystaticConfig from "../keystatic.config";

export type PostImageSettings = {
  maxBytes: number;
  maxDimension: number;
};

type SavedSettings = {
  imageMaxSizeKiB?: number | null;
  imageMaxDimension?: number | null;
};

export function resolvePostImageSettings(
  settings: SavedSettings | null,
): PostImageSettings {
  const schema = keystaticConfig.singletons.siteSettings.schema;
  const resolve = (
    value: number | null | undefined,
    fallback: number | null,
    min: number,
    max: number,
  ) =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
      ? value
      : fallback!;

  return {
    maxBytes:
      resolve(
        settings?.imageMaxSizeKiB,
        schema.imageMaxSizeKiB.defaultValue(),
        1,
        10240,
      ) * 1024,
    maxDimension: resolve(
      settings?.imageMaxDimension,
      schema.imageMaxDimension.defaultValue(),
      64,
      8192,
    ),
  };
}
