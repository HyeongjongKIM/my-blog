import { expect, it, vi } from "vitest";

const { create, handle } = vi.hoisted(() => {
  const handle = vi.fn(async () => new Response("ok"));
  return {
    handle,
    create: vi.fn(() => ({ GET: handle, POST: handle })),
  };
});
vi.mock("@keystatic/next/route-handler", () => ({ makeRouteHandler: create }));
vi.mock("../keystatic.config", () => ({
  default: { storage: { kind: "github" } },
}));

it("creates the authenticated handler only when a request arrives", async () => {
  const route = await import("../app/api/keystatic/[...params]/route.admin");
  expect(create).not.toHaveBeenCalled();
  const request = new Request("https://admin.test/api/keystatic/github/login");
  expect((await route.GET(request)).status).toBe(200);
  expect(create).toHaveBeenCalledTimes(1);
  expect(handle).toHaveBeenLastCalledWith(request);
  expect((await route.POST(request)).status).toBe(200);
  expect(create).toHaveBeenCalledTimes(2);
});
