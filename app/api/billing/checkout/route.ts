import { NextResponse } from "next/server";
import { billingErrorMessage, providerFailure } from "@/lib/payments/errors";
import { startSubscriptionCheckout } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const result = await startSubscriptionCheckout(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    const provider = providerFailure(error);
    if (provider || !(error instanceof Error)) {
      console.error("Unable to start subscription checkout", error);
    }
    const message = billingErrorMessage(error, "Could not start checkout.");
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : provider ? 502 : 400 },
    );
  }
}
