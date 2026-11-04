-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "BillingOwnerType" AS ENUM ('USER', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'RAZORPAY', 'MANUAL');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED', 'INCOMPLETE_EXPIRED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "user_id" TEXT NOT NULL,
    "active_organization_id" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backup_codes" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failed_verification_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creator_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'PLANNING',
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "share_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doc" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "content" JSONB,
    "yjs_state" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Canvas" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "content" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Canvas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPrompt" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspace_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentChatHistory" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentChatHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "monthly_price" INTEGER NOT NULL DEFAULT 0,
    "yearly_price" INTEGER NOT NULL DEFAULT 0,
    "monthly_prompt_limit" INTEGER NOT NULL DEFAULT 100,
    "workspace_limit" INTEGER DEFAULT 3,
    "unlimited_workspaces" BOOLEAN NOT NULL DEFAULT false,
    "public_sharing" BOOLEAN NOT NULL DEFAULT false,
    "pdf_export" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "stripe_product_id" TEXT,
    "stripe_monthly_price_id" TEXT,
    "stripe_yearly_price_id" TEXT,
    "razorpay_monthly_plan_id" TEXT,
    "razorpay_yearly_plan_id" TEXT,
    "razorpay_monthly_cycles" INTEGER,
    "razorpay_yearly_cycles" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "owner_type" "BillingOwnerType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "owner_type" "BillingOwnerType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_customer_id" TEXT NOT NULL,
    "provider_subscription_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "interval" "BillingInterval" NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "next_billing_date" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "owner_type" "BillingOwnerType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "provider_payment_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "description" TEXT,
    "paid_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "owner_type" "BillingOwnerType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "provider_invoice_id" TEXT NOT NULL,
    "amount_due" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "hosted_invoice_url" TEXT,
    "invoice_pdf_url" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutAttempt" (
    "id" TEXT NOT NULL,
    "owner_type" "BillingOwnerType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "initiated_by_user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "provider_customer_id" TEXT NOT NULL,
    "provider_checkout_id" TEXT NOT NULL,
    "provider_subscription_id" TEXT,
    "checkout_url" TEXT,
    "coupon_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "owner_type" "BillingOwnerType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_payment_method_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "expiry_month" INTEGER,
    "expiry_year" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- CreateIndex
CREATE INDEX "Account_user_id_idx" ON "Account"("user_id");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactor_user_id_key" ON "TwoFactor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_share_token_key" ON "Workspace"("share_token");

-- CreateIndex
CREATE INDEX "Workspace_creator_id_idx" ON "Workspace"("creator_id");

-- CreateIndex
CREATE INDEX "Workspace_organization_id_idx" ON "Workspace"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Member_user_id_idx" ON "Member"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organization_id_user_id_key" ON "Member"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_organization_id_status_idx" ON "Invitation"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Doc_workspace_id_key" ON "Doc"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "Canvas_workspace_id_key" ON "Canvas"("workspace_id");

-- CreateIndex
CREATE INDEX "AgentPrompt_ownerId_createdAt_idx" ON "AgentPrompt"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentChatHistory_workspace_id_key" ON "AgentChatHistory"("workspace_id");

-- CreateIndex
CREATE INDEX "BillingCustomer_owner_id_idx" ON "BillingCustomer"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_owner_type_owner_id_provider_key" ON "BillingCustomer"("owner_type", "owner_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_provider_provider_customer_id_key" ON "BillingCustomer"("provider", "provider_customer_id");

-- CreateIndex
CREATE INDEX "Subscription_owner_type_owner_id_status_idx" ON "Subscription"("owner_type", "owner_id", "status");

-- CreateIndex
CREATE INDEX "Subscription_plan_id_idx" ON "Subscription"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_provider_provider_subscription_id_key" ON "Subscription"("provider", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "Payment_owner_type_owner_id_createdAt_idx" ON "Payment"("owner_type", "owner_id", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_subscription_id_idx" ON "Payment"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_provider_payment_id_key" ON "Payment"("provider", "provider_payment_id");

-- CreateIndex
CREATE INDEX "Invoice_owner_type_owner_id_createdAt_idx" ON "Invoice"("owner_type", "owner_id", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_subscription_id_idx" ON "Invoice"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_provider_provider_invoice_id_key" ON "Invoice"("provider", "provider_invoice_id");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_owner_type_owner_id_status_idx" ON "CheckoutAttempt"("owner_type", "owner_id", "status");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_initiated_by_user_id_createdAt_idx" ON "CheckoutAttempt"("initiated_by_user_id", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutAttempt_provider_provider_checkout_id_key" ON "CheckoutAttempt"("provider", "provider_checkout_id");

-- CreateIndex
CREATE INDEX "PaymentMethod_owner_type_owner_id_idx" ON "PaymentMethod"("owner_type", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_provider_provider_payment_method_id_key" ON "PaymentMethod"("provider", "provider_payment_method_id");

-- CreateIndex
CREATE INDEX "PaymentEvent_processed_at_createdAt_idx" ON "PaymentEvent"("processed_at", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_external_event_id_key" ON "PaymentEvent"("provider", "external_event_id");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactor" ADD CONSTRAINT "TwoFactor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Canvas" ADD CONSTRAINT "Canvas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPrompt" ADD CONSTRAINT "AgentPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPrompt" ADD CONSTRAINT "AgentPrompt_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentChatHistory" ADD CONSTRAINT "AgentChatHistory_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
