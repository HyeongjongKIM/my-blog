<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project context

- This is a Next.js 16 App Router blog using React 19, TypeScript, Tailwind CSS 4, and Keystatic with GitHub storage for editing and a local checkout reader for builds.
- Routes and layouts live in `app/`. `app/reader.ts` creates the Keystatic reader; `keystatic.config.ts` defines the post schema. Posts live in `src/content/posts/` and their images in `public/images/posts/`.
- Use pnpm 10.33.4 and Node.js 22 (see `.nvmrc`). Do not switch package managers or edit the lockfile without changing dependencies.

## Working loop

1. Read `README.md` and inspect `git status --short` before editing. Preserve existing user changes and untracked content.
2. For Next.js work, read the relevant guide in `node_modules/next/dist/docs/` as required above. Check the installed package's APIs for other libraries when needed.
3. Make the smallest change that meets the request. Add or update focused tests when behavior changes and a test can catch a real regression.
4. Run focused checks while working, then `pnpm check` before finishing. If a check cannot run, report which one and why.
5. Report what changed, what was verified, and any remaining limitation.

## Checks

- `pnpm dev`: local development server, including the Keystatic UI at `/keystatic`.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`: individual checks.
- `pnpm build` / `pnpm build:static`: production static export to `out/`, excluding the Keystatic administrator and API routes.
- `pnpm check`: full local and CI gate. The current test command permits no test files; do not describe an empty test run as behavioral coverage.
