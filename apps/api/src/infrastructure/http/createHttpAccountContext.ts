import type { AuditSink } from "@lojaveiculosv2/audit";
import type { TenantId } from "@lojaveiculosv2/shared";
import type { Context } from "hono";
import type {
  AccountProvisioningRepository,
  ClerkUserProfile,
} from "../../domains/identity/ports/accountProvisioningRepository.js";
import { AccountProvisioningProviderError } from "../../domains/identity/services/AccountProvisioningService/serviceSupport.js";
import type { ClerkUserProfileProvider } from "../auth/clerkAccountProvisioning.js";
import {
  createNoopAuditSink,
  createPolicyAwareAuditSink,
} from "../../shared/auditSink.js";
import {
  createServiceContext,
  type ServiceContext,
  type ServiceLogger,
} from "../../shared/serviceContext.js";
import { createConsoleServiceLogger } from "../../shared/serviceLogger.js";
import {
  HttpContextAuthenticationError,
  HttpContextRequestPolicyError,
} from "./httpContextErrors.js";
import type { HttpIdentityVerifier } from "./httpIdentityVerifier.js";
import { readHttpRequestId } from "./requestMetadata.js";

export type HttpAccountContext = {
  profile: ClerkUserProfile;
  serviceContext: ServiceContext;
};

export type CreateHttpAccountContextOptions = {
  audit?: AuditSink;
  identityVerifier?: HttpIdentityVerifier;
  logger?: ServiceLogger;
  profileProvider?: ClerkUserProfileProvider;
  repository?: AccountProvisioningRepository;
  tenantId?: string;
};

export async function createHttpAccountContext(
  context: Context,
  options: CreateHttpAccountContextOptions = {},
): Promise<HttpAccountContext> {
  const request = readRequestHeaders(context);
  const logger =
    options.logger ??
    createConsoleServiceLogger({
      correlationId: request.correlationId,
      requestId: request.requestId,
    });
  const audit = createPolicyAwareAuditSink({
    logger,
    sink: options.audit ?? createNoopAuditSink(),
  });
  const clerkUserId = await resolveClerkUserId(
    context,
    options.identityVerifier,
  );
  const profile = await resolveProfile(
    context,
    clerkUserId,
    options.profileProvider,
  );
  if (!profile.emailVerified) {
    throw new HttpContextAuthenticationError(
      "Clerk primary email must be verified.",
    );
  }
  const accountAuth = await resolveAccountAuthorization(profile, options);
  return {
    profile,
    serviceContext: createServiceContext({
      actor: {
        externalId: profile.clerkUserId,
        id: accountAuth.actorId,
        kind: "user",
      },
      audit,
      logger,
      permissions: accountAuth.permissions,
      request,
      source: { component: "http", service: "api" },
      ...(options.tenantId ? { tenantId: options.tenantId } : {}),
    }),
  };
}

async function resolveAccountAuthorization(
  profile: ClerkUserProfile,
  options: CreateHttpAccountContextOptions,
) {
  const permissions = new Set(["identity.session.bootstrap"]);
  if (!options.repository) {
    return {
      actorId: profile.clerkUserId,
      permissions: [...permissions],
    };
  }

  const user = await options.repository.ensureUser(profile);
  if (await options.repository.canCreateOwnerStore(user.id)) {
    permissions.add("identity.owner_store.create");
  }
  const isPlatformAdmin = await options.repository.hasActivePlatformAdmin(
    user.id,
  );
  if (isPlatformAdmin) {
    permissions.add("billing.manage");
    permissions.add("tenant.manage");
    permissions.add("store.manage");
  }
  if (options.tenantId) {
    const isAgency = await options.repository.hasActiveTenantRole({
      role: "agency",
      tenantId: options.tenantId as TenantId,
      userId: user.id,
    });
    if (isAgency) {
      permissions.add("billing.manage");
      permissions.add("store.manage");
    }
  }
  return {
    actorId: user.id,
    permissions: [...permissions],
  };
}

async function resolveClerkUserId(
  context: Context,
  identityVerifier?: HttpIdentityVerifier,
) {
  if (identityVerifier) {
    try {
      const identity = await identityVerifier.verify(context);
      if (!identity) throw new Error("missing identity");
      return identity.clerkUserId;
    } catch {
      throw new HttpContextAuthenticationError(
        "Invalid or expired Clerk token.",
      );
    }
  }

  const clerkUserId =
    context.req.header("x-clerk-user-id") ?? localClerkUserId();
  if (!clerkUserId) {
    throw new HttpContextAuthenticationError(
      "Account routes require authenticated Clerk user.",
    );
  }
  if (!allowsTrustedIdentityHeaders()) {
    throw new HttpContextAuthenticationError(
      "Trusted identity headers are only accepted in local/test.",
    );
  }
  return clerkUserId;
}

async function resolveProfile(
  context: Context,
  clerkUserId: string,
  profileProvider?: ClerkUserProfileProvider,
) {
  if (profileProvider) {
    try {
      return await profileProvider.getProfile(clerkUserId);
    } catch (error) {
      if (error instanceof AccountProvisioningProviderError) throw error;
      throw new AccountProvisioningProviderError(
        "Clerk profile lookup failed.",
      );
    }
  }
  if (!allowsTrustedIdentityHeaders()) {
    throw new HttpContextRequestPolicyError(
      "Clerk profile provider is required outside local/test.",
      400,
    );
  }
  const email =
    context.req.header("x-user-email") ??
    (clerkUserId === "clerk_platform_admin"
      ? "platform@lojaveiculos.com.br"
      : `${clerkUserId}@local.test`);
  return {
    clerkUserId,
    email,
    emailVerified: true,
    name: context.req.header("x-user-name") ?? null,
  };
}

function allowsTrustedIdentityHeaders(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.APP_ENV) return process.env.APP_ENV === "local";
  return process.env.NODE_ENV === "test";
}

function localClerkUserId(): string | undefined {
  if (!allowsTrustedIdentityHeaders()) return undefined;
  if (process.env.LOCAL_AUTH_BYPASS !== "true") return undefined;
  return process.env.DEV_CLERK_USER_ID ?? "clerk_test_user";
}

function readRequestHeaders(context: Context) {
  const requestId = readHttpRequestId(context) ?? crypto.randomUUID();
  const correlationId = context.req.header("x-correlation-id") ?? requestId;
  return {
    correlationId,
    method: context.req.method,
    path: context.req.path,
    requestId,
  };
}
