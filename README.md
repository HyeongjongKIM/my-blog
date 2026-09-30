# My Blog

A Next.js App Router blog with local Keystatic content. Posts are stored as Markdoc files in `src/content/posts/`, with post images in `public/images/posts/`.

## Setup

Use Node.js 22 and pnpm 10.33.4. If you use nvm, run `nvm use` to select the version in `.nvmrc`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the blog, or [http://localhost:3000/keystatic](http://localhost:3000/keystatic) to edit local posts. Keystatic writes content and images into the repository, so review `git status` after editing.

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
