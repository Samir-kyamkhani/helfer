# Helfer

Helfer is a collaborative workspace application built with Next.js, Better Auth, Prisma, PostgreSQL, and Supabase Realtime. Billing uses provider adapters for Stripe and Razorpay.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set the database, Better Auth, email, OAuth, and optional payment provider settings described in [the setup guide](docs/auth-billing-setup.md).
3. Apply the Prisma migrations with `npx prisma migrate deploy`.
4. Start the development server with `npm run dev`.

The Better Auth handler is served from `/api/auth`. Configure Google OAuth to return to `/api/auth/callback/google` and configure Stripe or Razorpay webhooks as described in the setup guide.

## Development checks

- `npx prisma validate`
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
