import { NextResponse } from "next/server";
import { z } from "zod";
import { billingErrorMessage, providerFailure } from "@/lib/payments/errors";
import {
  cancelCurrentSubscription,
  changeSubscriptionPlan,
  createPaymentManagementSession,
  resumeCurrentSubscription,
} from "@/lib/payments/service";

const requestSchema = z.object({
  action: z.enum(["change-plan", "cancel", "resume", "payment-method"]),
  ownerType: z.enum(["USER", "ORGANIZATION"]),
  ownerId: z.string().trim().min(1).max(128),
  planId: z.string().trim().min(1).max(128).optional(),
  interval: z.enum(["MONTHLY", "YEARLY"]).optional(),
  atPeriodEnd: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid billing request." }, { status: 400 });
    }
    const body = parsed.data;
    const owner = { ownerType: body.ownerType, ownerId: body.ownerId };
    if (body.action === "change-plan") {
      return NextResponse.json(await changeSubscriptionPlan({ ...owner, planId: body.planId, interval: body.interval }));
    }
    if (body.action === "cancel") {
      return NextResponse.json(await cancelCurrentSubscription(owner, body.atPeriodEnd ?? true));
    }
    if (body.action === "resume") return NextResponse.json(await resumeCurrentSubscription(owner));
    if (body.action === "payment-method") return NextResponse.json({ url: await createPaymentManagementSession(owner) });
    return NextResponse.json({ error: "Unknown billing action." }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid billing request." }, { status: 400 });
    }
    const provider = providerFailure(error);
    if (provider || !(error instanceof Error)) {
      console.error("Unable to update subscription", error);
    }
    const message = billingErrorMessage(error, "Could not update subscription.");
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : provider ? 502 : 400 },
    );
  }
}
