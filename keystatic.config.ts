import { config, fields, collection, singleton } from "@keystatic/core";
import type { Config } from "@markdoc/markdoc";

export const markdocConfig: Config = {};

export default config({
  storage: {
    kind: "local",
  },
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
      },
    }),
  },
  collections: {
    posts: collection({
      label: "Posts",
      slugField: "title",
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
