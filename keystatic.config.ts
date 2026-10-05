import { config, fields, collection, singleton } from "@keystatic/core";
import type { Config } from "@markdoc/markdoc";

export const markdocConfig: Config = {};

export default config({
  storage:
    process.env.NEXT_PUBLIC_KEYSTATIC_STORAGE === "github"
      ? { kind: "github", repo: "HyeongjongKIM/my-blog" }
      : { kind: "local" },
  singletons: {
    siteSettings: singleton({
      label: "Blog Settings",
      path: "src/content/site-settings",
      format: "json",
      schema: {
        title: fields.text({
          label: "Blog Title",
          defaultValue: "My Blog",
          validation: { isRequired: true },
        }),
        tagline: fields.text({
          label: "Tagline",
          defaultValue: "Thoughts, notes, and stories.",
          validation: { isRequired: true },
        }),
        metaDescription: fields.text({
          label: "Meta Description",
          defaultValue: "A personal blog for thoughts, notes, and stories.",
          multiline: true,
          validation: { isRequired: true },
        }),
        favicon: fields.image({
          label: "Favicon",
          description:
            "Upload a square image (PNG or SVG recommended) for the browser tab. Remove it to use the default icon.",
          directory: "public/images/site",
          publicPath: "/images/site",
        }),
        imageMaxSizeKiB: fields.integer({
          label: "Image size limit (KiB)",
          description: "Maximum saved file size per image. 1024 KiB = 1 MiB.",
          defaultValue: 500,
          validation: { min: 1, max: 10240 },
        }),
        imageMaxDimension: fields.integer({
          label: "Image maximum dimension (px)",
          description:
            "Maximum width or height, keeping the aspect ratio. Save settings before uploading images.",
          defaultValue: 1920,
          validation: { min: 64, max: 8192 },
        }),
      },
    }),
  },
  collections: {
    posts: collection({
      label: "Posts",
      slugField: "title",
      columns: ["title", "createdAt"],
      path: "src/content/posts/*",
      format: { contentField: "content" },
      schema: {
        title: fields.slug({ name: { label: "Title" } }),
        createdAt: fields.datetime({
          label: "Created At",
          defaultValue: { kind: "now" },
        }),
        content: fields.markdoc({
          label: "Content",
          options: {
            image: {
              directory: "public/images/posts",
              publicPath: "/images/posts",
            },
          },
        }),
      },
    }),
  },
});
