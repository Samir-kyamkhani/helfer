"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { PlanButton } from "@/components/PlanButton";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const isLandingPage = pathname === "/";
  const user = session?.user;
  const isSignedIn = Boolean(user);

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-18 items-center justify-between border-b border-white/6 bg-background/70 px-6 backdrop-blur-md md:px-10">
      <Link
        href={isSignedIn && !isLandingPage ? "/dashboard" : "/"}
        className="flex items-center"
      >
        <Image
          src="/brand/logo-navbar-dark.png"
          alt="Helfer"
          width={314}
          height={160}
          className="h-9 w-auto"
          priority
        />
      </Link>

      {isLandingPage && (
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="#product" className="transition-colors hover:text-foreground">
            Product
          </Link>
          <Link href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>
      )}

      <div className="flex items-center gap-3">
        {isPending ? (
          <span className="size-8 animate-pulse rounded-full bg-white/10" />
        ) : user ? (
          <>
            <OrganizationSwitcher />
            {isLandingPage ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <PlanButton />
            )}
            <details className="relative">
              <summary className="flex size-9 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-sm font-medium text-foreground">
                {user.image ? (
                  // The profile image URL may come from any user-approved HTTPS host.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  user.name.slice(0, 1).toUpperCase()
                )}
              </summary>
              <div className="absolute right-0 mt-2 flex w-52 flex-col rounded-xl border border-white/10 bg-background p-2 shadow-xl">
                <div className="border-b border-white/8 px-3 py-2">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/settings/profile">
                  Account settings
                </Link>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/settings/organizations">
                  Organizations
                </Link>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/settings/billing">
                  Billing
                </Link>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  onClick={async () => {
                    await authClient.signOut();
                    router.push("/");
                  }}
                >
                  Sign out
                </button>
              </div>
            </details>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/sign-in?next=${encodeURIComponent(pathname || "/dashboard")}`}>
                Sign in
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
