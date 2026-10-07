import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = {
  ...defineCloudflareConfig(),
  buildCommand: "pnpm build:admin:next",
};

export default config;
