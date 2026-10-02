export function SiteFooter({ title }: { title: string }) {
  return (
    <footer className="border-border/70 border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-7 text-center text-xs tracking-[0.12em] sm:px-10">
        <p>© {title}</p>
      </div>
    </footer>
  );
}
