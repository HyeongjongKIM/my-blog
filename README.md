# My Blog

A Next.js App Router blog with local Keystatic content. Posts are stored as Markdoc files in `src/content/posts/`, with post images in `public/images/posts/`.

## Setup

Use Node.js 22 and pnpm 10.33.4. If you use nvm, run `nvm use` to select the version in `.nvmrc`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the blog, or [http://localhost:3000/keystatic](http://localhost:3000/keystatic) to edit local posts. Keystatic writes content and images into the repository, so review `git status` after editing.

When a post is saved through local Keystatic, uploaded JPEG, PNG, and WebP images are optimized before being written to `public/images/posts/`. In Keystatic → Blog Settings, set **Image size limit (KiB)** and **Image maximum dimension (px)**, then save settings before uploading images. The defaults are 500 KiB (512,000 bytes) and 1920 px. Changes apply to subsequent saves without restarting the server. Optimization starts at the configured dimension and quality 82, then tries quality 72 and 62 and progressively smaller bounds (5/6, 2/3, 1/2, and 1/3 of that dimension) until the file fits. PNG uses lossless compression after resizing. The original format, aspect ratio, path, and transparency are preserved; smaller originals are retained. Animation, SVG, GIF, and AVIF are not compressed but must meet the same byte limit. Undecodable images also must meet the limit. If optimization cannot meet the limit, the entire save is rejected before files are written. Metadata is stripped from optimized images. Keep original photos separately if needed. Existing files and direct filesystem copies are not automatically optimized or checked. Settings are stored in `src/content/site-settings.json` and can be committed with the blog. Missing or empty settings use the defaults defined in `keystatic.config.ts`.

## Project map

| Path                   | Purpose                                |
| ---------------------- | -------------------------------------- |
| `app/`                 | Pages, layouts, and Keystatic routes   |
| `app/reader.ts`        | Keystatic content reader               |
| `keystatic.config.ts`  | Content schema and local storage setup |
| `src/content/posts/`   | Markdoc post files                     |
| `public/images/posts/` | Images uploaded with posts             |
| `components/`, `lib/`  | Shared UI and utilities                |

## Validation

Run the same gate locally that CI runs on pushes and pull requests:

```bash
pnpm check
```

This checks formatting, ESLint, TypeScript, Vitest, and the production build in that order. You can also run each step with `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build`.

The pre-commit hook formats and lints staged files. The pre-push hook runs the full-project type check and tests.

There are currently no test files. `pnpm test` permits an empty suite; the other checks still run. Add focused tests alongside behavior changes when they can catch a real regression.

For coding agents, [AGENTS.md](AGENTS.md) contains the project workflow and the installed Next.js documentation rule.
