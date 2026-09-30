import Link from "next/link";
import { reader } from "./reader";

export default async function Homepage() {
  const posts = await reader.collections.posts.all();

  return (
    <div>
      <h1>Keystatic ⚡️</h1>
      <p>This homepage shows how to load a collection from the reader API.</p>
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
