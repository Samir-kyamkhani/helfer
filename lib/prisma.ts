import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
});

export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  transactionOptions: {
    // Payment verification and webhook events arrive together, so interactive
    // transactions can briefly queue for a pooled connection. Prisma's 2s
    // default is too short for the remote Supabase pooler and throws
    // "Unable to start a transaction in the given time."
    maxWait: 10_000,
    timeout: 15_000,
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
