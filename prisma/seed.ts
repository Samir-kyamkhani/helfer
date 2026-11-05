import { prisma } from "@/lib/prisma";

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    currency: "INR",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPromptLimit: 100,
    workspaceLimit: 1,
    unlimitedWorkspaces: false,
    publicSharing: false,
    pdfExport: false,
    sortOrder: 1,
    active: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For professionals and growing teams",
    currency: "INR",
    monthlyPrice: 49900,
    yearlyPrice: 499900,
    monthlyPromptLimit: 2000,
    workspaceLimit: 10,
    unlimitedWorkspaces: false,
    publicSharing: true,
    pdfExport: true,
    sortOrder: 2,
    active: true,
  },
  {
    id: "business",
    name: "Business",
    description: "For teams that need more power",
    currency: "INR",
    monthlyPrice: 149900,
    yearlyPrice: 1499900,
    monthlyPromptLimit: 10000,
    workspaceLimit: 0,
    unlimitedWorkspaces: true,
    publicSharing: true,
    pdfExport: true,
    sortOrder: 3,
    active: true,
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }

  console.log("Subscription plans seeded successfully!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
