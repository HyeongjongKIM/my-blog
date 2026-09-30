import React, { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdoc from "@markdoc/markdoc";
import { reader } from "../../reader";
import { markdocConfig } from "../../../keystatic.config";

const getPost = cache(async (slug: string) => {
  const post = await reader.collections.posts.read(slug);
  if (!post) notFound();
  return post;
});

function formatPostDate(value: unknown) {
  const date = value instanceof Date ? value.toISOString() : value;
  return typeof date === "string" ? date.slice(0, 16).replace("T", " ") : "—";
}

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
    <div>
      <h1>{post.title}</h1>
      <h2>Created At: {formatPostDate(post.createdAt)}</h2>
      {Markdoc.renderers.react(renderable, React)}
    </div>
  );
}

export async function generateStaticParams() {
  const slugs = await reader.collections.posts.list();

  return slugs.map((slug) => ({
    slug,
  }));
}
