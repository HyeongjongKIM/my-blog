const config = {
  "*.{js,jsx,mjs,ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,css,md,mdx,yml,yaml}": "prettier --write",
};

export default config;
