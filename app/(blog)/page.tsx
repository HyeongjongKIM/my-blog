import Image from "next/image";
import Link from "next/link";
import { reader } from "../reader";
import { formatPostDate } from "@/lib/format-post-date";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteSettings } from "@/app/site-settings";

export default async function Homepage() {
  const [posts, settings] = await Promise.all([
    reader.collections.posts.all(),
    getSiteSettings(),
  ]);
  const entries = await Promise.all(
    posts.map(async (post) => {
      const { node } = await post.entry.content();
      let image: string | undefined;
      let excerpt = "";

      for (const child of node.walk()) {
        if (
          !image &&
          child.type === "image" &&
          typeof child.attributes.src === "string"
        ) {
          image = child.attributes.src;
        }
        if (
          child.type === "text" &&
          typeof child.attributes.content === "string"
        ) {
          excerpt += `${child.attributes.content} `;
        }
      }

      return {
        slug: post.slug,
        title: post.entry.title,
        createdAt: post.entry.createdAt,
        image,
        excerpt: excerpt.trim().slice(0, 160),
      };
    }),
  );
  const sortedPosts = entries.toSorted((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10 sm:pb-32">
      <section
        className="pt-20 pb-14 text-center sm:pt-24 sm:pb-18"
        aria-labelledby="page-heading"
      >
        <p className="text-muted-foreground mb-6 text-xs tracking-[0.24em] uppercase">
          {settings.tagline}
        </p>
        <h1
          id="page-heading"
          className="font-heading text-3xl font-normal tracking-[0.12em] sm:text-4xl"
        >
          Posts
        </h1>
      </section>

      <section id="posts" className="scroll-mt-10" aria-label="Posts">
        {sortedPosts.length ? (
          <ul className="mx-auto max-w-4xl space-y-8 sm:space-y-11">
            {sortedPosts.map((post, index) => (
              <li key={post.slug}>
                <article>
                  <Link
                    href={`/posts/${post.slug}`}
                    aria-label={`Read ${post.title}`}
                    className="group focus-visible:outline-ring block focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    <Card className="border-border overflow-hidden rounded-none border py-0 ring-0">
                      <div className="grid md:min-h-64 md:grid-cols-[40%_60%]">
                        <div className="bg-muted relative block aspect-4/3 overflow-hidden md:aspect-auto md:min-h-64">
                          {post.image ? (
                            <Image
                              src={post.image}
                              alt=""
                              fill
                              sizes="(max-width: 768px) 100vw, 360px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <span
                              className="text-muted-foreground flex h-full min-h-64 items-center justify-center font-mono text-7xl font-light -tracking-widest"
                              aria-hidden="true"
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                        <CardContent className="flex flex-col justify-between p-7 sm:p-9">
                          <div>
                            <time
                              className="text-muted-foreground text-xs tracking-widest"
                              dateTime={post.createdAt ?? undefined}
                            >
                              {formatPostDate(post.createdAt)}
                            </time>
                            <h2 className="font-heading mt-5 text-2xl font-medium tracking-tighter break-keep sm:text-3xl">
                              <span className="group-hover:text-muted-foreground transition-colors">
                                {post.title}
                              </span>
                            </h2>
                            {post.excerpt ? (
                              <p className="text-muted-foreground mt-4 line-clamp-3 text-sm leading-7 break-keep">
                                {post.excerpt}
                              </p>
                            ) : null}
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-border text-muted-foreground mx-auto max-w-4xl border-t border-b py-16 text-center text-sm">
            No posts yet.
          </div>
        )}
      </section>
    </div>
  );
}
