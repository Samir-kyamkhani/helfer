import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/workspace",
  "/workspaces",
  "/settings",
  "/checkout",
];

export function proxy(request: NextRequest) {
  const isProtected = protectedPrefixes.some(
    (prefix) =>
      request.nextUrl.pathname === prefix ||
      request.nextUrl.pathname.startsWith(`${prefix}/`),
  );

  // This cookie-presence check is only an optimistic redirect. The main layout, actions, and
  // route handlers validate the Better Auth session against the database before returning data.
  if (isProtected && !getSessionCookie(request)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Auth callbacks and webhooks validate their own signatures and do not need Proxy checks.
    "/(api|trpc)(.*)",
  ],
};
