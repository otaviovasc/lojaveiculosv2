import type { RoleKey } from "@lojaveiculosv2/shared";
import type {
  ServiceActor,
  ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  AccountProvisioningRepository,
  ClerkUserProfile,
  InvitationSender,
} from "../../ports/accountProvisioningRepository.js";

export type AccountProvisioningPorts = {
  accountProvisioningRepository: AccountProvisioningRepository;
  invitationSender: InvitationSender;
};

export class AccountProvisioningPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountProvisioningPolicyError";
  }
}

export class AccountProvisioningScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountProvisioningScopeError";
  }
}

export class AccountProvisioningProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountProvisioningProviderError";
  }
}

export function requireClerkActor(context: ServiceContext): string {
  if (context.actor.kind !== "user" || !context.actor.externalId) {
    throw new AccountProvisioningPolicyError(
      "Account provisioning requires authenticated Clerk user context.",
    );
  }
  return context.actor.externalId;
}

export function assertVerifiedPrimaryEmail(profile: ClerkUserProfile) {
  if (profile.emailVerified) return;
  throw new AccountProvisioningPolicyError(
    "Account provisioning requires a verified primary email in Clerk.",
  );
}

export function normalizePublicSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2) {
    throw new AccountProvisioningPolicyError(
      "Slug must contain at least two letters or numbers.",
    );
  }
  return slug;
}

export function assertAssignableStoreInviteRole(
  role: RoleKey,
): asserts role is "investor" | "owner" | "salesman" | "supervisor" {
  if (["investor", "owner", "salesman", "supervisor"].includes(role)) return;
  throw new AccountProvisioningPolicyError(
    "Only owner, supervisor, salesman, or investor can be invited to a store.",
  );
}

export function assertStoreInviteRoleAllowedByActor(
  actorRole: RoleKey | null,
  targetRole: RoleKey,
) {
  if (
    actorRole === "agency" &&
    ["investor", "owner", "salesman", "supervisor"].includes(targetRole)
  ) {
    return;
  }
  if (
    actorRole === "owner" &&
    ["investor", "salesman", "supervisor"].includes(targetRole)
  ) {
    return;
  }
  throw new AccountProvisioningPolicyError(
    "Actor role cannot invite the requested store role.",
  );
}

export async function auditInvitationSendFailure(
  context: ServiceContext,
  input: {
    action: string;
    actor?: ServiceActor;
    invitationId: string;
    role: RoleKey;
    storeId: string | null;
    summary: string;
    tenantId: string;
  },
) {
  await context.audit.record({
    action: input.action,
    actor: input.actor ?? context.actor,
    category: "authorization",
    criticality: "critical",
    entityId: input.invitationId,
    entityType: "identity_invitation",
    metadata: {
      provider: "clerk",
      role: input.role,
      storeId: input.storeId,
    },
    outcome: "failed",
    requestId: context.requestId,
    storeId: input.storeId,
    summary: input.summary,
    tenantId: input.tenantId,
  });
}

export const trialEntitlements = [
  "analytics",
  "crm",
  "marketplace",
  "plate_lookup",
  "subdomain",
] as const;
