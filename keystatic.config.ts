import { config, fields, collection } from "@keystatic/core";
import type { Config } from "@markdoc/markdoc";

export const markdocConfig: Config = {};

export default config({
  storage: {
    kind: "local",
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
