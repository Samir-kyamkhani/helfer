import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  workspace: ["create", "read", "update", "delete"],
  billing: ["read", "manage"],
} as const;

export const organizationAccess = createAccessControl(statement);

export const organizationRoles = {
  owner: organizationAccess.newRole({
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    workspace: ["create", "read", "update", "delete"],
    billing: ["read", "manage"],
  }),
  admin: organizationAccess.newRole({
    organization: ["update"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    workspace: ["create", "read", "update", "delete"],
    billing: ["read", "manage"],
  }),
  member: organizationAccess.newRole({
    workspace: ["create", "read", "update"],
    billing: ["read"],
  }),
};

export type OrganizationRoleName = keyof typeof organizationRoles;

export function canManageOrganization(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canManageBilling(role: string | null | undefined) {
  return canManageOrganization(role);
}
