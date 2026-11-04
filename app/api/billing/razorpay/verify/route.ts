import { NextResponse } from "next/server";
import { verifyRazorpayCheckout } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await verifyRazorpayCheckout(await request.json()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify checkout.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 });
  }
}
