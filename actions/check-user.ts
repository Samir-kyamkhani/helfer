"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function checkUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) return null;

  const existing = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (existing) return existing;

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) return null;

  const user = prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      email,
      name:
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        "Unknown User",
      imageUrl: clerkUser.imageUrl,
    },
  });

  return user;
}
