"use client";

import { useEffect } from "react";
import { makePage } from "@keystatic/next/ui/app";
import config from "../../keystatic.config";
import { createOptimizingGitHubFetch } from "@/lib/github-image-optimization";

const KeystaticPage = makePage(config);

export default function KeystaticApp() {
  useEffect(() => {
    if (config.storage.kind !== "github") return;
    const original = window.fetch;
    const adapted = createOptimizingGitHubFetch(
      original.bind(window),
      "HyeongjongKIM/my-blog",
    );
    window.fetch = adapted;
    return () => {
      if (window.fetch === adapted) window.fetch = original;
    };
  }, []);
  return <KeystaticPage />;
}
