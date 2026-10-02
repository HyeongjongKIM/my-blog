import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettings } from "@/app/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: {
      default: settings.title,
      template: `%s | ${settings.title}`,
    },
    description: settings.metaDescription,
  };
}

export default async function BlogLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <>
      <SiteHeader title={settings.title} />
      <main className="flex-1">{children}</main>
      <SiteFooter title={settings.title} />
    </>
  );
}
