# My Blog

A Next.js App Router blog with Keystatic GitHub storage. Posts are stored as Markdoc files in `src/content/posts/`, with post images in `public/images/posts/`.

## Setup

Use Node.js 22 and pnpm 10.33.4. If you use nvm, run `nvm use` to select the version in `.nvmrc`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the blog, or [http://localhost:3000/keystatic](http://localhost:3000/keystatic) to manage content in `HyeongjongKIM/my-blog` on GitHub.

## Keystatic GitHub setup

On the first visit to `/keystatic`, click **Log in with GitHub** and follow the wizard to create a GitHub App. Leave the deployed project URL blank: the administrator runs locally. Install the app for `HyeongjongKIM/my-blog`. Your GitHub account needs write access to the repository.

The wizard generates authentication variables in an ignored `.env` file. [.env.example](.env.example) lists the required names. For an existing app, place its values in `.env.local` instead; avoid defining conflicting values in both files. Restart `pnpm dev` after changing environment variables. Never commit actual credentials.

The GitHub App callback URL must match your local origin, for example `http://localhost:3000/api/keystatic/github/oauth/callback`. Use the same host and port when opening the administrator.

Saving in Keystatic commits directly to the selected GitHub branch. The blog reader still reads the local checkout at development and build time. Run `git pull --ff-only` to see GitHub edits locally once your working tree is ready. Existing untracked content is not uploaded by changing the storage mode.

GitHub saves go directly from the browser to GitHub and bypass the former local `/api/keystatic/update` image compression hook. Automatic upload compression and size rejection no longer apply; optimize images before uploading. Existing image settings are retained for compatibility with the local optimization utilities, but changing them does not affect GitHub uploads.

See the [Keystatic GitHub mode guide](https://keystatic.com/docs/github-mode) for GitHub App setup details.

## Project map

| Path                   | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `app/`                 | Pages, layouts, and Keystatic routes    |
| `app/reader.ts`        | Keystatic content reader                |
| `keystatic.config.ts`  | Content schema and GitHub storage setup |
| `src/content/posts/`   | Markdoc post files                      |
| `public/images/posts/` | Images uploaded with posts              |
| `components/`, `lib/`  | Shared UI and utilities                 |

## Validation

Run the same gate locally that CI runs on pushes and pull requests:

```bash
pnpm check
```

This checks formatting, ESLint, TypeScript, Vitest, and the production build in that order. You can also run each step with `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build`.

The pre-commit hook formats and lints staged files. The pre-push hook runs the full-project type check and tests.

There are currently no test files. `pnpm test` permits an empty suite; the other checks still run. Add focused tests alongside behavior changes when they can catch a real regression.

For coding agents, [AGENTS.md](AGENTS.md) contains the project workflow and the installed Next.js documentation rule.
