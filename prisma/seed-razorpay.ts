import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.subscriptionPlan.update({
    where: { id: "pro" },
    data: {
      razorpayMonthlyPlanId: "plan_TwmWJSyKLUHnDs",
      razorpayYearlyPlanId: "plan_TwmXnxhA8ESiee",
      razorpayMonthlyCycles: 120,
      razorpayYearlyCycles: 10,
    },
  });

  await prisma.subscriptionPlan.update({
    where: { id: "business" },
    data: {
      razorpayMonthlyPlanId: "plan_TwmYMRtWcogvqC",
      razorpayYearlyPlanId: "plan_TwmYmHG6YdChRy",
      razorpayMonthlyCycles: 120,
      razorpayYearlyCycles: 10,
    },
  });

  console.log("Razorpay plans configured successfully!");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
