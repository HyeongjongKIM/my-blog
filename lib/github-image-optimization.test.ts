// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOptimizingGitHubFetch } from "./github-image-optimization";
import { POST } from "@/app/api/keystatic/optimize-images/route.admin";

afterEach(() => vi.unstubAllGlobals());

const repo = "HyeongjongKIM/my-blog";
const endpoint = "https://api.github.com/graphql";
function mutation(additions: { path: string; contents: string }[]) {
  return {
    query:
      "mutation CreateCommit($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }",
    variables: {
      input: {
        branch: { repositoryNameWithOwner: repo, branchName: "main" },
        expectedHeadOid: "original-head",
        message: { headline: "Update posts" },
        fileChanges: {
          additions,
          deletions: [{ path: "public/images/posts/old.png" }],
        },
      },
    },
  };
}
function request(body: ReturnType<typeof mutation>) {
  return new Request(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });
}

describe("GitHub image optimization", () => {
  it("optimizes post and favicon bytes before committing, using remote settings and keeping auth private", async () => {
    const image = Buffer.from("source image");
    const worker = vi.fn<typeof fetch>(async (_input, init) => {
      const form = init!.body as FormData;
      return new Response(
        Buffer.concat([
          Buffer.from([0xff, 0xef, 0xfe]),
          Buffer.from(`optimized-${form.get("width")}`),
        ]),
        {
          headers: { "content-type": "image/png" },
        },
      );
    });
    vi.stubGlobal("fetch", worker);
    const body = mutation([
      {
        path: "public/images/posts/photo.png",
        contents: image.toString("base64"),
      },
      {
        path: "public/images/site/favicon.png",
        contents: image.toString("base64"),
      },
      {
        path: "src/content/posts/post.mdoc",
        contents: Buffer.from("Post text").toString("base64"),
      },
    ]);
    let committed: typeof body | undefined;
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      if (input === "/api/keystatic/optimize-images") {
        expect(new Headers(init?.headers).has("authorization")).toBe(false);
        return POST(
          new Request("http://localhost/api/keystatic/optimize-images", {
            ...init,
            headers: { ...init?.headers, origin: "http://localhost" },
          }),
        );
      }
      const outgoing = new Request(input, init);
      const payload = await outgoing.json();
      expect(outgoing.headers.get("authorization")).toBe("Bearer test-token");
      if (payload.query.includes("query ImageSettings")) {
        expect(payload.variables.expression).toBe(
          "original-head:src/content/site-settings.json",
        );
        return Response.json({
          data: {
            repository: {
              object: {
                text: JSON.stringify({
                  imageMaxSizeKiB: 100,
                  imageMaxDimension: 800,
                }),
              },
            },
          },
        });
      }
      committed = payload;
      return Response.json({
        data: { createCommitOnBranch: { commit: { oid: "new-head" } } },
      });
    });
    const response = await createOptimizingGitHubFetch(
      fetcher,
      repo,
    )(request(body));
    expect(response.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(committed?.variables.input.branch).toEqual(
      body.variables.input.branch,
    );
    expect(committed?.variables.input.expectedHeadOid).toBe("original-head");
    expect(committed?.variables.input.fileChanges.deletions).toEqual(
      body.variables.input.fileChanges.deletions,
    );
    const additions = committed!.variables.input.fileChanges.additions;
    expect(additions[2]).toEqual(body.variables.input.fileChanges.additions[2]);
    for (const [index, width] of [800, 64].entries()) {
      const expected = Buffer.concat([
        Buffer.from([0xff, 0xef, 0xfe]),
        Buffer.from(`optimized-${width}`),
      ]);
      expect(additions[index].contents).toBe(expected.toString("base64"));
      expect(additions[index].contents).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
      expect(additions[index].contents.length % 4).toBe(0);
    }
    expect(worker).toHaveBeenCalledTimes(2);
    for (const [, init] of worker.mock.calls) {
      expect(new Headers(init?.headers).get("authorization")).not.toBe(
        "Bearer test-token",
      );
    }
  });

  it("uses settings included in the same commit without reading GitHub", async () => {
    const body = mutation([
      {
        path: "src/content/site-settings.json",
        contents: Buffer.from(
          JSON.stringify({
            title: "한글",
            imageMaxSizeKiB: 20,
            imageMaxDimension: 128,
          }),
        ).toString("base64"),
      },
      { path: "public/images/posts/a.png", contents: "AAAA" },
    ]);
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      if (input === "/api/keystatic/optimize-images") {
        const payload = JSON.parse(init!.body as string);
        expect(payload.settings).toEqual({
          maxBytes: 20 * 1024,
          maxDimension: 128,
        });
        return Response.json({ additions: payload.additions });
      }
      return Response.json({ data: {} });
    });
    await createOptimizingGitHubFetch(fetcher, repo)(request(body));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(["optimization", "settings"])(
    "stops the commit when %s fails",
    async (failure) => {
      const fetcher = vi.fn<typeof fetch>(async (input) => {
        if (input === "/api/keystatic/optimize-images")
          return new Response("Image exceeds limit", { status: 413 });
        if (failure === "settings")
          return Response.json({ errors: [{ message: "Denied" }] });
        return Response.json({ data: { repository: { object: null } } });
      });
      await expect(
        createOptimizingGitHubFetch(
          fetcher,
          repo,
        )(
          request(
            mutation([{ path: "public/images/posts/a.png", contents: "AAAA" }]),
          ),
        ),
      ).rejects.toThrow(
        failure === "settings" ? "Could not read" : "exceeds limit",
      );
      expect(fetcher).toHaveBeenCalledTimes(failure === "settings" ? 1 : 2);
    },
  );

  it("passes through unrelated fetches, reads, and text-only commits", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ data: {} }),
    );
    const adapted = createOptimizingGitHubFetch(fetcher, repo);
    const textOnly = request(
      mutation([{ path: "src/content/posts/a.mdoc", contents: "AAAA" }]),
    );
    await adapted(textOnly);
    expect(fetcher).toHaveBeenLastCalledWith(textOnly, undefined);
    await adapted("/api/keystatic/update", { method: "POST", body: "local" });
    expect(fetcher).toHaveBeenLastCalledWith("/api/keystatic/update", {
      method: "POST",
      body: "local",
    });
    const other = mutation([
      { path: "public/images/posts/a.png", contents: "AAAA" },
    ]);
    other.variables.input.branch.repositoryNameWithOwner = "other/repo";
    const otherRequest = request(other);
    await adapted(otherRequest);
    expect(fetcher).toHaveBeenLastCalledWith(otherRequest, undefined);
  });
});

describe("optimization API", () => {
  it("rejects cross-origin requests and invalid limits", async () => {
    const crossOrigin = new Request(
      "http://localhost/api/keystatic/optimize-images",
      { method: "POST", headers: { origin: "https://example.com" } },
    );
    expect((await POST(crossOrigin)).status).toBe(403);
    const invalid = new Request(
      "http://localhost/api/keystatic/optimize-images",
      {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          additions: [],
          settings: { maxBytes: 1, maxDimension: 0 },
        }),
      },
    );
    expect((await POST(invalid)).status).toBe(400);
  });
});
