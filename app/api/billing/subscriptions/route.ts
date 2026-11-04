import { NextResponse } from "next/server";
import {
  cancelCurrentSubscription,
  changeSubscriptionPlan,
  createPaymentManagementSession,
  resumeCurrentSubscription,
} from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      action?: string;
      ownerType?: string;
      ownerId?: string;
      planId?: string;
      interval?: string;
      atPeriodEnd?: boolean;
    };
    const owner = { ownerType: body.ownerType, ownerId: body.ownerId };
    if (body.action === "change-plan") {
      return NextResponse.json(await changeSubscriptionPlan({ ...owner, planId: body.planId, interval: body.interval }));
    }
    if (body.action === "cancel") return NextResponse.json(await cancelCurrentSubscription(owner, body.atPeriodEnd !== false));
    if (body.action === "resume") return NextResponse.json(await resumeCurrentSubscription(owner));
    if (body.action === "payment-method") return NextResponse.json({ url: await createPaymentManagementSession(owner) });
    return NextResponse.json({ error: "Unknown billing action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update subscription.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 });
  }
}
