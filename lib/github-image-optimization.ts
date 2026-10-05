import { resolvePostImageSettings } from "./post-image-settings";

const imagePath =
  /^public\/images\/(?:posts|site)\/(?!(?:.*\/)?\.\.(?:\/|$)).+\.(?:jpe?g|png|webp|gif|svg|avif|ico)$/i;
const settingsPath = "src/content/site-settings.json";

/** Adapter for Keystatic 0.6's createCommitOnBranch GraphQL transport. */
export function createOptimizingGitHubFetch(
  fetcher: typeof fetch,
  repository: string,
): typeof fetch {
  return async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== "https://api.github.com/graphql") return fetcher(input, init);
    const request = new Request(input, init);
    if (request.method !== "POST") return fetcher(input, init);
    const body = await request.clone().json();
    const commit = body.variables?.input;
    if (
      !/\bcreateCommitOnBranch\s*\(/.test(body.query ?? "") ||
      commit?.branch?.repositoryNameWithOwner !== repository ||
      !Array.isArray(commit.fileChanges?.additions)
    )
      return fetcher(input, init);

    const additions: { path: string; contents: string }[] =
      commit.fileChanges.additions;
    const images = additions.filter((addition) =>
      imagePath.test(addition.path),
    );
    if (!images.length) return fetcher(input, init);

    // Read settings from the exact commit being edited, rather than the local checkout.
    const savedSettings = additions.find(
      (addition) => addition.path === settingsPath,
    );
    let settings;
    if (savedSettings) {
      settings = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(savedSettings.contents), (char) =>
            char.charCodeAt(0),
          ),
        ),
      );
    } else {
      const [owner, name] = repository.split("/");
      const response = await fetcher(url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify({
          query:
            "query ImageSettings($owner: String!, $name: String!, $expression: String!) { repository(owner: $owner, name: $name) { object(expression: $expression) { ... on Blob { text } } } }",
          variables: {
            owner,
            name,
            expression: `${commit.expectedHeadOid}:${settingsPath}`,
          },
        }),
      });
      if (!response.ok)
        throw new Error(
          "Could not read image settings from GitHub. Save was stopped.",
        );
      const result = await response.json();
      if (result.errors?.length || !result.data?.repository)
        throw new Error(
          "Could not read image settings from GitHub. Save was stopped.",
        );
      const text = result.data.repository.object?.text;
      settings = text ? JSON.parse(text) : null;
    }
    const optimized = await fetcher("/api/keystatic/optimize-images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        additions: images,
        settings: resolvePostImageSettings(settings),
      }),
    });
    if (!optimized.ok) throw new Error(await optimized.text());
    const result: { additions: { path: string; contents: string }[] } =
      await optimized.json();
    if (
      result.additions.length !== images.length ||
      result.additions.some(
        (addition, index) =>
          addition.path !== images[index].path ||
          typeof addition.contents !== "string",
      )
    ) {
      throw new Error("Invalid image optimization response. Save was stopped.");
    }
    const contents = new Map(
      result.additions.map((addition) => [addition.path, addition.contents]),
    );
    commit.fileChanges.additions = additions.map((addition) => ({
      ...addition,
      contents: contents.get(addition.path) ?? addition.contents,
    }));
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    return fetcher(
      new Request(request, { headers, body: JSON.stringify(body) }),
    );
  };
}
