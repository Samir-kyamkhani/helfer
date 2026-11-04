"use client";

import { createAuthClient } from "better-auth/react";
import {
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { organizationAccess, organizationRoles } from "@/lib/auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({ ac: organizationAccess, roles: organizationRoles }),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.replace("/verify-two-factor");
      },
    }),
  ],
});

export const googleAuthEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
