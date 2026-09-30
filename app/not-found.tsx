import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>Page Not Found</h1>
      <p>Check the URL or return to the post list.</p>
      <Link href="/">Back to Posts</Link>
    </main>
  );
}
