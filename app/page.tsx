import Link from "next/link";
import { reader } from "./reader";
import { getSiteSettings } from "./site-settings";

export default async function Homepage() {
  const [posts, settings] = await Promise.all([
    reader.collections.posts.all(),
    getSiteSettings(),
  ]);

  return (
    <div>
      <h1>{settings.title}</h1>
      <p>{settings.tagline}</p>
      <p>
        <Link href="/keystatic">Click here to visit the Admin UI</Link>, or the
        link below to view a post in the collection.
      </p>
      <h2>Posts</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`posts/${post.slug}`}>{post.entry.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
