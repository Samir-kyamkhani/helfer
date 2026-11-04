import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GoodbyePage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-16">
      <section className="max-w-lg rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
        <h1 className="font-heading text-3xl font-semibold">Account deleted</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your Helfer account has been deleted. You can create a new account at any time.
        </p>
        <Button asChild className="mt-6"><Link href="/">Return home</Link></Button>
      </section>
    </main>
  );
}
