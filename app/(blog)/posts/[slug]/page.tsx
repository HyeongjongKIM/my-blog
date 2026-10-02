import React, { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdoc from "@markdoc/markdoc";
import { reader } from "../../../reader";
import { markdocConfig } from "../../../../keystatic.config";
import { formatPostDate } from "@/lib/format-post-date";

const getPost = cache(async (slug: string) => {
  const post = await reader.collections.posts.read(slug);
  if (!post) notFound();
  return post;
});

export async function generateMetadata({
  params,
}: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  return { title: post.title };
}

export default async function Post({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);

  const { node } = await post.content();

  const errors = Markdoc.validate(node, markdocConfig);
  if (errors.length) {
    console.error(errors);
    throw new Error("Invalid content");
  }

  const renderable = Markdoc.transform(node, markdocConfig);

  return (
    <article className="mx-auto w-full max-w-4xl px-6 pt-16 pb-24 sm:px-10 sm:pt-20 sm:pb-32">
      <header className="border-border mb-12 border-b pb-10 text-center sm:mb-16 sm:pb-14">
        <p className="text-muted-foreground mb-6 text-xs tracking-[0.2em] uppercase">
          journal / {formatPostDate(post.createdAt)}
        </p>
        <h1 className="font-heading text-[clamp(2.75rem,7vw,5rem)] leading-[1.12] font-medium tracking-[-0.06em] break-keep">
          {post.title}
        </h1>
      </header>
      <div className="post-content">
        {Markdoc.renderers.react(renderable, React)}
      </div>
    </article>
  );
}

export async function generateStaticParams() {
  const slugs = await reader.collections.posts.list();

  return slugs.map((slug) => ({
    slug,
  }));
}
