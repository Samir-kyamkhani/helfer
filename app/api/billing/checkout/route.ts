import { NextResponse } from "next/server";
import { startSubscriptionCheckout } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const result = await startSubscriptionCheckout(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 });
  }
}
