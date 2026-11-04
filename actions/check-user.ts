"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function checkUser() {
  const session = await getCurrentSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}
