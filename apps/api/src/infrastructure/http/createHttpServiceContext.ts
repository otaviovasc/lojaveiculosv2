import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import {
  resolveStoreContext,
  StoreAccessDeniedError,
} from "../../domains/identity/services/IdentityService/resolveStoreContext.js";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import type { StoreAccessRepository } from "../../domains/identity/ports/storeAccessRepository.js";
import {
  createContextualAuditSink,
  createNoopAuditSink,
  createPolicyAwareAuditSink,
} from "../../shared/auditSink.js";
import {
  createServiceContext,
  type ServiceContext,
  type ServiceLogger,
} from "../../shared/serviceContext.js";
import { createConsoleServiceLogger } from "../../shared/serviceLogger.js";
import { createPlaceholderServiceContext } from "./createPlaceholderServiceContext.js";
import {
  createExternalApiServiceContext,
  externalApiContextKey,
  readExternalApiKey,
} from "./externalApiHttpContext.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "./httpContextErrors.js";
import type { HttpIdentityVerifier } from "./httpIdentityVerifier.js";
import { readHttpRequestHeaders } from "./requestMetadata.js";
import { resolveStoreSlugFromRequest } from "./storeScope.js";

export type CreateHttpServiceContextOptions = {
  audit?: AuditSink;
  externalApiRepository?: ExternalApiRepository;
  identityVerifier?: HttpIdentityVerifier;
  logger?: ServiceLogger;
  repository?: StoreAccessRepository;
};

export {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "./httpContextErrors.js";

export async function createHttpServiceContext(
  context: Context,
  options: CreateHttpServiceContextOptions = {},
): Promise<ServiceContext> {
  const request = readHttpRequestHeaders(context);
  const baseLogger =
    options.logger ??
    createConsoleServiceLogger({
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      service: "api",
    });
  const logger =
    baseLogger.child?.({
      component: "http",
      correlationId: request.correlationId,
      requestId: request.requestId,
    }) ?? baseLogger;
  const audit = createPolicyAwareAuditSink({
    sink: createContextualAuditSink({
      request,
      sink: options.audit ?? createNoopAuditSink(),
      source: {
        component: "http",
        environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
        service: "api",
      },
    }),
    logger,
  });
  const externalApiKey = readExternalApiKey(context);

  if (externalApiKey) {
    return createExternalApiServiceContext({
      audit,
      apiKey: externalApiKey,
      logger,
      onAuthenticated: (metadata) => {
        context.set(externalApiContextKey, metadata);
      },
      request,
      ...(options.externalApiRepository
        ? { repository: options.externalApiRepository }
        : {}),
    });
  }

  const identity = await resolveHttpIdentity(context, options.identityVerifier);

  if (!identity) {
    return createPlaceholderServiceContext(context, {
      audit,
      logger,
      request,
    });
  }

  if (!options.repository) {
    throw new HttpContextAuthenticationError(
      "Authenticated HTTP context requires store access repository",
    );
  }

  const resolved = await resolveContextOrThrow({
    actor: {
      externalId: identity.clerkUserId,
      id: identity.userId ?? identity.clerkUserId,
      kind: "user",
    },
    audit,
    clerkUserId: identity.clerkUserId,
    logger,
    repository: options.repository,
    requestId: request.requestId,
    storeSlug: identity.storeSlug,
  });

  return createServiceContext({
    actor: resolved.actor,
    audit: resolved.audit,
    ...(resolved.billingManagedBy
      ? { billingManagedBy: resolved.billingManagedBy }
      : {}),
    logger,
    ...(resolved.membershipRole
      ? { membershipRole: resolved.membershipRole }
      : {}),
    permissions: resolved.permissions,
    request,
    source: {
      component: "http",
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      service: "api",
    },
    storeId: resolved.storeId,
    tenantId: resolved.tenantId,
  });
}

async function resolveHttpIdentity(
  context: Context,
  identityVerifier?: HttpIdentityVerifier,
) {
  const storeSlug =
    context.req.header("x-store-slug") ?? resolveStoreSlugFromRequest(context);

  if (identityVerifier) {
    let verifiedIdentity: Awaited<ReturnType<HttpIdentityVerifier["verify"]>>;

    try {
      verifiedIdentity = await identityVerifier.verify(context);
    } catch {
      throw new HttpContextAuthenticationError(
        "Invalid or expired Clerk token.",
      );
    }

    if (!verifiedIdentity && !storeSlug) return null;
    if (!verifiedIdentity || !storeSlug) {
      throw new HttpContextAuthenticationError(
        "Authenticated HTTP context requires Clerk user and store slug",
      );
    }

    return { ...verifiedIdentity, storeSlug };
  }

  return readTrustedIdentityHeaders(context, storeSlug);
}

function readTrustedIdentityHeaders(
  context: Context,
  storeSlug?: string | null,
) {
  const bypassIdentity = readLocalBypassIdentity();
  const clerkUserId =
    context.req.header("x-clerk-user-id") ?? bypassIdentity.clerkUserId;
  const resolvedStoreSlug = storeSlug ?? bypassIdentity.storeSlug;
  const userId = context.req.header("x-user-id");

  if (!clerkUserId && !resolvedStoreSlug) {
    return null;
  }

  if (!allowsTrustedIdentityHeaders()) {
    throw new HttpContextAuthenticationError(
      "Trusted identity headers are only accepted in local/test.",
    );
  }

  if (!clerkUserId || !resolvedStoreSlug) {
    throw new HttpContextAuthenticationError(
      "Authenticated HTTP context requires Clerk user and store slug",
    );
  }

  return {
    clerkUserId,
    storeSlug: resolvedStoreSlug,
    ...(userId ? { userId } : {}),
  };
}

function allowsTrustedIdentityHeaders(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.APP_ENV) return process.env.APP_ENV === "local";
  return process.env.NODE_ENV === "test";
}

function readLocalBypassIdentity(): {
  clerkUserId?: string;
  storeSlug?: string;
} {
  if (!allowsTrustedIdentityHeaders()) return {};
  if (process.env.LOCAL_AUTH_BYPASS !== "true") return {};
  const clerkUserId = process.env.DEV_CLERK_USER_ID ?? "clerk_test_user";
  const storeSlug = process.env.DEV_STORE_SLUG ?? "test-store";

  return {
    ...(clerkUserId ? { clerkUserId } : {}),
    ...(storeSlug ? { storeSlug } : {}),
  };
}

async function resolveContextOrThrow(
  input: Parameters<typeof resolveStoreContext>[0],
) {
  try {
    return await resolveStoreContext(input);
  } catch (error) {
    if (error instanceof StoreAccessDeniedError) {
      throw new HttpContextAuthorizationError(error.message);
    }

    throw error;
  }
}
