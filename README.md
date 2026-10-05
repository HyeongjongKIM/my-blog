# My Blog

A Next.js App Router blog with Keystatic GitHub storage. Posts are stored as Markdoc files in `src/content/posts/`, with post images in `public/images/posts/`.

## Setup

Use Node.js 22 and pnpm 10.33.4. If you use nvm, run `nvm use` to select the version in `.nvmrc`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the blog, or [http://127.0.0.1:3000/keystatic](http://127.0.0.1:3000/keystatic) to manage content in `HyeongjongKIM/my-blog` on GitHub.

## Keystatic GitHub setup

In GitHub mode, Keystatic automatically redirects the administrator from `localhost` to `127.0.0.1` for OAuth. The Next.js `allowedDevOrigins` setting permits this loopback hostname to access development resources, including HMR. Open the administrator at `http://127.0.0.1:3000/keystatic` directly.

On the first visit to `/keystatic`, click **Log in with GitHub** and follow the wizard to create a GitHub App. Leave the deployed project URL blank: the administrator runs locally. Install the app for `HyeongjongKIM/my-blog`. Your GitHub account needs write access to the repository.

The wizard generates authentication variables in an ignored `.env` file. [.env.example](.env.example) lists the required names. For an existing app, place its values in `.env.local` instead; avoid defining conflicting values in both files. Restart `pnpm dev` after changing environment variables. Never commit actual credentials.

The GitHub App callback URL must match your local origin, for example `http://127.0.0.1:3000/api/keystatic/github/oauth/callback`. Use the same host and port when opening the administrator.

Saving in Keystatic commits directly to the selected GitHub branch. The blog reader still reads the local checkout at development and build time. Run `git pull --ff-only` to see GitHub edits locally once your working tree is ready. Existing untracked content is not uploaded by changing the storage mode.

GitHub saves go directly from the browser to GitHub and bypass the former local `/api/keystatic/update` image compression hook. Automatic upload compression and size rejection no longer apply; optimize images before uploading. Existing image settings are retained for compatibility with the local optimization utilities, but changing them does not affect GitHub uploads.

See the [Keystatic GitHub mode guide](https://keystatic.com/docs/github-mode) for GitHub App setup details.

## Static build

```bash
pnpm build:static
```

`pnpm build` produces the same static export in `out/`. Only `pnpm dev` exposes `/keystatic` and `/api/keystatic/*`; these routes are excluded from production builds and need no authentication variables there. The static blog reads the checked-out content during the build. Missing settings use the schema defaults, and an empty blog can be built before any content is committed.

Images are served as static files in production (`next/image` runtime optimization is disabled). There is no Next.js server to start in production; deploy the contents of `out/` to a static host.

## Cloudflare Pages automatic deployment

Create a **Pages** project in the Cloudflare dashboard using **Connect to Git**, authorize the Cloudflare GitHub App for `HyeongjongKIM/my-blog`, and select that repository. Use Git integration so Pages builds and deploys pushes directly.

| Setting                                 | Value                         |
| --------------------------------------- | ----------------------------- |
| Production branch                       | `main`                        |
| Framework preset                        | Next.js (Static HTML Export)  |
| Root directory                          | Repository root (leave blank) |
| Build command                           | `pnpm build:static`           |
| Build output directory                  | `out`                         |
| Build environment variable              | `NODE_VERSION=22`             |
| Build environment variable              | `PNPM_VERSION=10.33.4`        |
| Automatic production branch deployments | Enabled                       |

Apply the build environment variables to production and to previews if enabled. Pages installs dependencies before running the build command. Keystatic authentication variables belong only in the local administrator environment; this static deployment does not need them. A Wrangler deployment configuration and a GitHub Actions deployment workflow are unnecessary for this Git integration.

Once connected, a push or merged PR to `main` triggers a Pages build and replaces the production deployment when successful. Configure preview branch deployments separately: disable them if only `main` should build, or enable the branches where you want preview URLs. Keystatic commits to `main` trigger the same production build; edits on another branch must be merged to `main` to publish.

After the first deployment, check the build log and the assigned `*.pages.dev` URL. The homepage should load even before any posts are committed, and `/keystatic` and `/api/keystatic/github/login` should return 404. When you add content later, check that the deployed post and image URLs load after the next successful build.

Reference: [Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [Next.js static export deployment](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), and [build tool versions](https://developers.cloudflare.com/pages/configuration/build-image/).

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

This checks formatting, ESLint, TypeScript, Vitest, and the production static build in that order. You can also run each step with `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build`.

The pre-commit hook formats and lints staged files. The pre-push hook runs the full-project type check and tests.

Focused tests cover site settings, image utilities, administrator route isolation, and static export cleanup. `pnpm test` also permits an empty suite; an empty run is not behavioral coverage.

For coding agents, [AGENTS.md](AGENTS.md) contains the project workflow and the installed Next.js documentation rule.
