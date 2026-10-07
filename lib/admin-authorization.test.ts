import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeAdminImageRequest } from "./admin-authorization";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deployed administrator image authorization", () => {
  it("preserves local editing without GitHub authentication", async () => {
    vi.stubEnv("KEYSTATIC_ADMIN_WORKER", "");
    expect(
      await authorizeAdminImageRequest(new Request("https://admin.test")),
    ).toBeNull();
  });

  it("rejects anonymous deployed requests before calling GitHub", async () => {
    vi.stubEnv("KEYSTATIC_ADMIN_WORKER", "1");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await authorizeAdminImageRequest(new Request("https://admin.test")))
        ?.status,
    ).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "requires repository write permission (%s)",
    async (push) => {
      vi.stubEnv("KEYSTATIC_ADMIN_WORKER", "1");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(Response.json({ permissions: { push } })),
      );
      const response = await authorizeAdminImageRequest(
        new Request("https://admin.test", {
          headers: { cookie: "keystatic-gh-access-token=test-token" },
        }),
      );
      expect(response?.status ?? null).toBe(push ? null : 403);
    },
  );

  it("fails closed when GitHub cannot verify the token", async () => {
    vi.stubEnv("KEYSTATIC_ADMIN_WORKER", "1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await authorizeAdminImageRequest(
      new Request("https://admin.test", {
        headers: { cookie: "keystatic-gh-access-token=test-token" },
      }),
    );
    expect(response?.status).toBe(503);
  });
});
