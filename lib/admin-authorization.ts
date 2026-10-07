// Keystatic 0.6 stores its GitHub access token in this cookie. Validate the
// token with GitHub before allowing the deployed image API to spend resources.
export async function authorizeAdminImageRequest(
  request: Request,
): Promise<Response | null> {
  if (process.env.KEYSTATIC_ADMIN_WORKER !== "1") return null;
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("keystatic-gh-access-token="));
  if (!cookie) return new Response("Authentication required", { status: 401 });
  let token: string;
  try {
    token = decodeURIComponent(
      cookie.slice("keystatic-gh-access-token=".length),
    );
  } catch {
    return new Response("Invalid authentication", { status: 401 });
  }
  try {
    const response = await fetch(
      "https://api.github.com/repos/HyeongjongKIM/my-blog",
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "user-agent": "my-blog-admin",
          "x-github-api-version": "2022-11-28",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 401)
      return new Response("Authentication required", { status: 401 });
    if (response.status === 404 || response.status === 403)
      return new Response("Repository access required", { status: 403 });
    if (!response.ok)
      return new Response("Could not verify repository access", {
        status: 503,
      });
    const repo = await response.json();
    return repo.permissions?.push === true
      ? null
      : new Response("Repository write access required", { status: 403 });
  } catch {
    return new Response("Could not verify repository access", { status: 503 });
  }
}
