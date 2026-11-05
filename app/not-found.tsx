import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="topo-bg relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 pt-18 pb-16">
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
        <p className="eyebrow mb-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-card/80 px-3.5 py-1.5 shadow-xs backdrop-blur-sm">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
          Error 404
        </p>

        <h1 className="font-heading text-6xl font-semibold tracking-[-0.055em] text-foreground sm:text-7xl">
          Page not found
        </h1>

        <p className="mt-5 text-base leading-7 text-muted-foreground">
          This page could not be found. It may have been moved or deleted, or
          the link may be wrong.
        </p>

        <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Button
            asChild
            size="lg"
            className="h-11 gap-2 rounded-xl px-6 shadow-md"
          >
            <Link href="/">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to home
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 rounded-xl border-border-strong bg-card px-6 shadow-xs hover:bg-accent"
          >
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
