# My Blog

A Next.js App Router blog with Keystatic local editing and optional GitHub editing. Posts are stored as Markdoc files in `src/content/posts/`, with post images in `public/images/posts/`.

## Setup

Use Node.js 22 and pnpm 10.33.4. If you use nvm, run `nvm use` to select the version in `.nvmrc`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the blog and [http://localhost:3000/keystatic](http://localhost:3000/keystatic) to edit local content. GitHub authentication is not required for `pnpm dev`.

## Local editing and preview

`pnpm dev` selects Keystatic's official `local` storage mode. Saved posts, settings, and images are written to the local repository, so the administrator and the Next.js blog use the same content. Reload the blog after saving to check it before committing. This also supports developing new collections and their input forms before publishing sample content.

In **Blog Settings**, upload a square image in **Favicon** (PNG or SVG recommended) and save to change the browser tab icon. Remove the image and save to restore the default icon. Favicon uploads are stored in `public/images/site/`. Local and GitHub saves compress PNG, JPEG, and WebP favicons and resize to at most 64 px, preserving aspect ratio and transparency without enlarging small images. Other formats (including SVG and animated GIF) retain their original bytes and dimensions. All favicon uploads have a fixed 100 KiB saved-file limit, separate from the post image settings. Reload the blog after saving; browsers may cache tab icons. Production changes appear after rebuilding and deploying the site.

Image saves in both modes use the existing compression and size-limit handling. Configure **Image size limit (KiB)** and **Image maximum dimension (px)** in Blog Settings and save those settings before uploading images. Defaults are 500 KiB and 1920 px. GitHub saves read settings from the commit being edited, or from settings included in the same save.

Review the local changes and commit the content yourself when ready. Nothing is automatically committed or pushed in local mode. Publishing to Pages happens when you push to the configured deployment branch.

## Choose the editing mode

| Command           | Storage           | Administrator URL                 | Saving                                         |
| ----------------- | ----------------- | --------------------------------- | ---------------------------------------------- |
| `pnpm dev`        | Local filesystem  | `http://localhost:3000/keystatic` | Writes local files; preview before committing  |
| `pnpm dev:github` | GitHub repository | `http://127.0.0.1:3000/keystatic` | Commits directly to the selected GitHub branch |

Stop the current dev server with Ctrl+C before switching commands. Each command sets `NEXT_PUBLIC_KEYSTATIC_STORAGE` explicitly so the API and browser select the same official storage mode. No mode value needs to be added to `.env`. The blog reader always reads the local checkout, including when the administrator uses GitHub mode.

## Keystatic GitHub setup

Run `pnpm dev:github` to use the GitHub administrator for `HyeongjongKIM/my-blog`.

In GitHub mode, Keystatic automatically redirects the administrator from `localhost` to `127.0.0.1` for OAuth. The Next.js `allowedDevOrigins` setting permits this loopback hostname to access development resources, including HMR. Open the administrator at `http://127.0.0.1:3000/keystatic` directly.

Local administrator URLs have no trailing slash so Keystatic can recognize `/keystatic/setup`. Static production routes retain trailing slashes.

On the first visit to `/keystatic`, click **Log in with GitHub** and follow the wizard to create a GitHub App. Leave the deployed project URL blank: the administrator runs locally. Install the app for `HyeongjongKIM/my-blog`. Your GitHub account needs write access to the repository.

The wizard generates authentication variables in an ignored `.env` file. [.env.example](.env.example) lists the required names. For an existing app, place its values in `.env.local` instead; avoid defining conflicting values in both files. Restart `pnpm dev:github` after changing GitHub authentication variables. Never commit actual credentials.

The GitHub App callback URL must match your local origin, for example `http://127.0.0.1:3000/api/keystatic/github/oauth/callback`. Use the same host and port when opening the administrator.

Saving in Keystatic commits directly to the selected GitHub branch. The blog reader still reads the local checkout at development and build time. Run `git pull --ff-only` to see GitHub edits locally once your working tree is ready. Existing untracked content is not uploaded by changing the storage mode.

Before GitHub commits, the local administrator sends new post images and favicons to its optimization API. The API reuses the same image processing as local saves; GitHub credentials are never sent to it. Optimization or settings-read failures stop the save. SVG, animated images, and other unsupported formats retain their original bytes and remain subject to the size limit. This adapter targets Keystatic 0.6's GitHub GraphQL commit transport and should be verified when upgrading Keystatic.

See the [Keystatic GitHub mode guide](https://keystatic.com/docs/github-mode) for GitHub App setup details.

## Static build

```bash
pnpm build:static
```

`pnpm build` produces the same static export in `out/`. Only the dev server (`pnpm dev` or `pnpm dev:github`) exposes `/keystatic` and `/api/keystatic/*`; these routes are excluded from production builds and need no authentication variables there. The static blog reads the checked-out content during the build. Missing settings use the schema defaults, and an empty blog can be built before any content is committed.

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

## Development branch publishing

Keep `main` for production and Keystatic content, and `dev` for development. Push development commits to `dev`. After the existing **CI** workflow passes `pnpm check` for the latest `dev` push, **Publish dev** creates a `dev → main` PR (or reuses an open PR) and requests merge commit auto-merge. Failed checks, stale CI runs, and pushes without new changes do not publish. No squash, rebase, or branch deletion is requested. Once the merge reaches `main`, Cloudflare Pages builds production.

For initial setup, manually merge the workflow file into the default branch (`main`); GitHub only runs `workflow_run` listeners present on the default branch. Subsequent `dev` pushes use the automation. Repository settings must allow GitHub Actions to create pull requests, merge commits, and auto-merge. Keep **Automatically delete head branches** disabled. The workflow uses the built-in `GITHUB_TOKEN`; no personal access token is needed.

Configure required status checks on `main` if you want auto-merge to wait for additional checks. Without blocking requirements, the merge command may merge immediately after the successful `dev` CI run. PR checks created by `GITHUB_TOKEN` can require workflow approval, so approve them if GitHub shows that requirement. Conflicts or required reviews can also prevent automatic merging. A rule requiring every `main` change to use a PR must allow the Keystatic GitHub App to bypass it so direct content saves still work.

### Branch roles

Keep both branches permanently; do not delete or recreate `dev` after a release.

| Branch | Purpose                             | Production deployment                         |
| ------ | ----------------------------------- | --------------------------------------------- |
| `main` | Released code and Keystatic content | Each new commit triggers Cloudflare Pages     |
| `dev`  | Development changes                 | After CI passes and the PR merges into `main` |

### Content updates

Run `pnpm dev:github` and select **main** in the Keystatic administrator before saving posts, images, or Blog Settings. Saves commit directly to remote `main` and trigger a production build. The selected administrator branch is independent of the local Git checkout. To preview these saves locally, synchronize the checkout as described below; the blog reader does not fetch GitHub content automatically.

Publish schema changes to `main` before using the new fields to save production content.

### Start development

With a clean working tree, update the local `dev` branch and bring in the latest released code and content:

```bash
git fetch origin
git switch dev
git pull --ff-only origin dev
git merge origin/main
```

Resolve any merge conflicts before continuing. Use `pnpm dev` for local development. Local Keystatic edits create files in this checkout; review them separately when selecting files to commit.

### Publish development changes

Once the changes are ready for production, run the full gate, stage the intended files, and commit. Replace `<files>` and `<message>` with the actual paths and commit message:

```bash
pnpm check
git add <files>
git commit -m "<message>"
git push origin dev
```

For the first push of a new `dev` branch, use `git push -u origin dev` to set its upstream. Each successful development push with file changes is a release candidate; only push changes you are ready to publish.

Check GitHub **Actions** for **CI**, then **Publish dev**, and the resulting `dev → main` PR. The workflow reuses an open PR and requests **Create a merge commit** auto-merge. If GitHub requirements block the merge, resolve the failed checks, required workflow approvals, reviews, or conflicts. After merging, confirm the Cloudflare Pages production build succeeds.

### Synchronize after merging

Keep using the same `dev` branch. With a clean working tree, bring the merge commit and any new Keystatic content from remote `main` into `dev`:

```bash
git fetch origin
git switch dev
git pull --ff-only origin dev
git merge origin/main
git push origin dev
```

If `main` contains all current `dev` commits, this merge fast-forwards without creating another merge commit. If both branches have new commits, Git creates a merge commit and may require conflict resolution. A synchronization push with no file changes relative to `main` does not create another release PR.

Use **merge**, rather than rebase, to synchronize this shared, permanent `dev` branch. Rebasing unpublished development commits can be useful, but rebasing the published branch can rewrite commit IDs and require a force push. Routine development and synchronization need no force push.

Reference: [workflow_run events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run), [GitHub CLI PR merge](https://cli.github.com/manual/gh_pr_merge).

## Project map

| Path                   | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `app/`                 | Pages, layouts, and Keystatic routes       |
| `app/reader.ts`        | Keystatic content reader                   |
| `keystatic.config.ts`  | Content schema and selectable storage mode |
| `src/content/posts/`   | Markdoc post files                         |
| `public/images/posts/` | Images uploaded with posts                 |
| `components/`, `lib/`  | Shared UI and utilities                    |

## Validation

Run the same gate locally that CI runs on pushes and pull requests:

```bash
pnpm check
```

This checks formatting, ESLint, TypeScript, Vitest, and the production static build in that order. You can also run each step with `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build`.

The pre-commit hook formats and lints staged files. The pre-push hook runs the full-project type check and tests.

Focused tests cover site settings, image utilities, administrator route isolation, and static export cleanup. `pnpm test` also permits an empty suite; an empty run is not behavioral coverage.

For coding agents, [AGENTS.md](AGENTS.md) contains the project workflow and the installed Next.js documentation rule.
