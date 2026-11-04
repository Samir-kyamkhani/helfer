import { NextResponse } from "next/server";
import { getPaymentProviderByName } from "@/lib/payments/factory";
import { processVerifiedProviderEvent } from "@/lib/payments/service";
import type { PaymentProviderName, ProviderWebhookEvent } from "@/lib/payments/types";
import { Prisma } from "@/lib/generated/prisma/client";

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await context.params;
  const providerName = rawProvider.toUpperCase();
  if (providerName !== "STRIPE" && providerName !== "RAZORPAY") {
    return NextResponse.json({ error: "Unknown payment provider." }, { status: 404 });
  }
  const provider = providerName as PaymentProviderName;
  const signature = request.headers.get(provider === "STRIPE" ? "stripe-signature" : "x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  const rawBody = await request.text();
  let event: ProviderWebhookEvent;
  try {
    event = await getPaymentProviderByName(provider).verifyWebhook(
      rawBody,
      signature,
      request.headers.get("x-razorpay-event-id") ?? undefined,
    );
  } catch (error) {
    console.error(`${provider} webhook verification failed`, error);
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  try {
    const payload = JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue;
    const result = await processVerifiedProviderEvent(provider, event, payload);
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    console.error(`${provider} webhook processing failed`, error);
    return NextResponse.json({ error: "Webhook processing failed. The provider can retry this event." }, { status: 500 });
  }
}
