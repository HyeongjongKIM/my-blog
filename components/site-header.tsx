import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="border-border/80 border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-9 pb-8 sm:px-10 sm:pt-12 sm:pb-10">
        <Link
          href="/"
          className="font-heading focus-visible:outline-ring text-[2.75rem] leading-none font-black tracking-[-0.085em] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-[3.5rem]"
          aria-label={`${title} home`}
        >
          {title}
          <span className="text-muted-foreground">.</span>
        </Link>
        <div className="mt-5">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
