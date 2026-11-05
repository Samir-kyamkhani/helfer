"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { PlanButton } from "@/components/PlanButton";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";

const navLink =
  "rounded-md px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const menuItem =
  "rounded-lg px-3 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:bg-accent";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const isLandingPage = pathname === "/";
  const user = session?.user;
  const isSignedIn = Boolean(user);

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-18 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 md:px-10">
      <Link
        href={isSignedIn && !isLandingPage ? "/dashboard" : "/"}
        className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <Link href="#product" className={navLink}>
            Product
          </Link>
          <Link href="#how-it-works" className={navLink}>
            How it works
          </Link>
          <Link href="#pricing" className={navLink}>
            Pricing
          </Link>
        </nav>
      )}

      <div className="flex items-center gap-2 sm:gap-3">
        {isPending ? (
          <span className="size-8 animate-pulse rounded-full bg-muted" />
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
            <details className="group relative">
              <summary className="flex size-9 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-sm font-medium text-foreground shadow-xs transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-open:border-border-strong [&::-webkit-details-marker]:hidden">
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
              <div className="absolute right-0 z-30 mt-2 flex w-56 flex-col rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
                <div className="mb-1 border-b border-border px-3 py-2">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <Link className={menuItem} href="/settings/profile">
                  Account settings
                </Link>
                <Link className={menuItem} href="/settings/organizations">
                  Organizations
                </Link>
                <Link className={menuItem} href="/settings/billing">
                  Billing
                </Link>
                <button
                  type="button"
                  className={`${menuItem} text-left text-muted-foreground`}
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
              <Link
                href={`/sign-in?next=${encodeURIComponent(pathname || "/dashboard")}`}
              >
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
