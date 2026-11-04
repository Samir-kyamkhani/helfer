import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization, twoFactor } from "better-auth/plugins";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { organizationAccess, organizationRoles } from "@/lib/auth/permissions";

const appUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

function deliverEmail(message: { to: string; subject: string; text: string }) {
  after(async () => {
    try {
      await sendTransactionalEmail(message);
    } catch (error) {
      console.error("Transactional email delivery failed", error);
    }
  });
}

export const auth = betterAuth({
  appName: "Helfer",
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [appUrl],
  database: prismaAdapter(prisma, { provider: "postgresql", transaction: true }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      deliverEmail({
        to: user.email,
        subject: "Reset your Helfer password",
        text: `Use this link to choose a new password. This link expires soon:\n${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      deliverEmail({
        to: user.email,
        subject: "Verify your Helfer email",
        text: `Verify your email address to finish setting up Helfer:\n${url}`,
      });
    },
  },
  socialProviders: googleClientId && googleClientSecret
    ? { google: { clientId: googleClientId, clientSecret: googleClientSecret, prompt: "select_account" } }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        deliverEmail({
          to: user.email,
          subject: "Confirm your Helfer email change",
          text: `Confirm changing your Helfer email to ${newEmail}:\n${url}`,
        });
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const ownedOrganization = await prisma.member.findFirst({
          where: { userId: user.id, role: "owner" },
          select: { organizationId: true },
        });
        if (ownedOrganization) {
          throw new APIError("BAD_REQUEST", {
            message: "Transfer ownership or delete your organizations before deleting this account.",
          });
        }
      },
      sendDeleteAccountVerification: async ({ user, url }) => {
        deliverEmail({
          to: user.email,
          subject: "Confirm your Helfer account deletion",
          text: `Confirm permanent deletion of your Helfer account:\n${url}`,
        });
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 10,
  },
  plugins: [
    organization({
      ac: organizationAccess,
      roles: organizationRoles,
      creatorRole: "owner",
      membershipLimit: 100,
      requireEmailVerificationOnInvitation: true,
      cancelPendingInvitationsOnReInvite: true,
      sendInvitationEmail: async ({ id, email, role, organization, inviter }) => {
        const url = new URL("/settings/organizations/invitations", appUrl);
        url.searchParams.set("invitationId", id);
        deliverEmail({
          to: email,
          subject: `Invitation to join ${organization.name} on Helfer`,
          text: `${inviter.user.name} invited you to join ${organization.name} as ${role}. Sign in with ${email} and accept the invitation here:\n${url.toString()}`,
        });
      },
    }),
    twoFactor(),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
