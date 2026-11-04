# Authentication, organizations, and billing setup

## Server configuration

Copy `.env.example` and provide:

- `BETTER_AUTH_SECRET`: at least 32 random bytes. Keep it stable between deployments.
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`: the public application origin.
- Google OAuth client ID and secret. Register `/api/auth/callback/google`; `NEXT_PUBLIC_GOOGLE_CLIENT_ID` controls whether the Google button is shown.
- `RESEND_API_KEY` and a verified `EMAIL_FROM` sender for verification, password reset, email changes, organization invitations, and account deletion.
- Optional `PAYMENT_PROVIDER=STRIPE` with Stripe API/webhook secrets, or `PAYMENT_PROVIDER=RAZORPAY` with Razorpay key ID, key secret, and webhook secret.
- `SUPABASE_JWT_SECRET` for private-channel authorization. This value is server-only.

Never expose payment secrets or the Supabase JWT secret through a `NEXT_PUBLIC_` variable.

## Database

The Prisma schema contains Better Auth users, accounts, sessions, organizations, memberships, and invitations, plus provider-neutral billing records. The cleanup migration removes obsolete identity bridge columns while preserving Better Auth records, organization memberships, workspaces, plans, subscriptions, payments, invoices, and usage history. It normalizes old workspace and billing references before dropping their source columns.

Back up the database and review the SQL in `prisma/migrations/20261104150000_remove_legacy_identity/migration.sql`. Obtain explicit approval before applying this cleanup migration to a production database. Then run `npx prisma migrate deploy` and `npx prisma generate`.

## Plans and payment providers

Plan amounts are stored in the provider's smallest currency unit, such as cents or paise. Checkout stays disabled until each paid plan is linked to the selected provider's products.

For each paid plan, configure the corresponding `SubscriptionPlan` fields:

- Stripe: `stripe_product_id`, `stripe_monthly_price_id`, and/or `stripe_yearly_price_id`.
- Razorpay: `razorpay_monthly_plan_id` and/or `razorpay_yearly_plan_id`, plus a finite monthly or yearly cycle count. The adapter does not guess a cycle count.

Checkout resolves plan, amount, and ownership on the server. Stripe promotion codes are supported. Razorpay offers are configured in Razorpay plan settings, and payment methods are managed through the subscription flow.

Configure webhooks at:

- Stripe: `POST /api/billing/webhooks/stripe` for subscription, checkout, invoice, payment, and refund events.
- Razorpay: `POST /api/billing/webhooks/razorpay` for subscription, payment, invoice, and refund events.

Webhook raw bodies are signature-verified before processing. Provider event IDs are stored uniquely so retries do not duplicate billing records.

## Private document collaboration

Run `docs/supabase-realtime-rls.sql` in the Supabase SQL editor and disable public Realtime channels in the project's Realtime settings. The browser requests a short-lived JWT only after the server confirms the current Better Auth session and workspace membership.

The canvas sync URL points to a separately hosted tldraw sync worker. That worker must enforce authenticated workspace membership before accepting a room connection.
