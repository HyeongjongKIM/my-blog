import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettings } from "@/app/site-settings";

export default async function NotFound() {
  const settings = await getSiteSettings();

  return (
    <>
      <SiteHeader title={settings.title} />
      <main className="mx-auto flex min-h-[60vh] w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:px-10">
        <p className="text-muted-foreground mb-5 text-xs tracking-[0.22em] uppercase">
          404 / Not found
        </p>
        <h1 className="font-heading text-4xl font-medium tracking-[-0.06em] sm:text-6xl">
          Page not found.
        </h1>
        <p className="text-muted-foreground mt-6 text-base">
          Check the URL or return to the post list.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
      </main>
      <SiteFooter title={settings.title} />
    </>
  );
}
