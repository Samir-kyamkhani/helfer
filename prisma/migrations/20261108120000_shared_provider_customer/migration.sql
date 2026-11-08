-- Provider customers can be shared by multiple billing owners. Razorpay
-- deduplicates customers by email, so a user and their organization can
-- legitimately resolve to the same provider customer id.
DROP INDEX IF EXISTS "BillingCustomer_provider_provider_customer_id_key";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BillingCustomer_provider_provider_customer_id_idx" ON "BillingCustomer"("provider", "provider_customer_id");
