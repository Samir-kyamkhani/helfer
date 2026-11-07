import { NextResponse } from "next/server";
import { billingErrorMessage, providerFailure } from "@/lib/payments/errors";
import { verifyRazorpayCheckout } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await verifyRazorpayCheckout(await request.json()));
  } catch (error) {
    const provider = providerFailure(error);
    if (provider || !(error instanceof Error)) {
      console.error("Unable to verify Razorpay checkout", error);
    }
    const message = billingErrorMessage(error, "Could not verify checkout.");
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : provider ? 502 : 400 },
    );
  }
}
