import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import {
  resolveStoreContext,
  StoreAccessDeniedError,
} from "../../domains/identity/services/IdentityService/resolveStoreContext.js";
import type { StoreAccessRepository } from "../../domains/identity/ports/storeAccessRepository.js";
import { createNoopAuditSink } from "../../shared/auditSink.js";
import type {
  ServiceContext,
  ServiceLogger,
} from "../../shared/serviceContext.js";
import { createConsoleServiceLogger } from "../../shared/serviceLogger.js";
import { createPlaceholderServiceContext } from "./createPlaceholderServiceContext.js";
import type { HttpIdentityVerifier } from "./httpIdentityVerifier.js";
import { resolveStoreSlugFromRequest } from "./storeScope.js";

export type CreateHttpServiceContextOptions = {
  audit?: AuditSink;
  identityVerifier?: HttpIdentityVerifier;
  logger?: ServiceLogger;
  repository?: StoreAccessRepository;
};

export class HttpContextAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpContextAuthenticationError";
  }
}

export class HttpContextAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpContextAuthorizationError";
  }
}

export async function createHttpServiceContext(
  context: Context,
  options: CreateHttpServiceContextOptions = {},
): Promise<ServiceContext> {
  const identity = await resolveHttpIdentity(context, options.identityVerifier);

  if (!identity) {
    return createPlaceholderServiceContext(context);
  }

  if (!options.repository) {
    throw new HttpContextAuthenticationError(
      "Authenticated HTTP context requires store access repository",
    );
  }

  const request = readRequestHeaders(context);
  const logger =
    options.logger ??
    createConsoleServiceLogger({
      correlationId: request.correlationId,
      requestId: request.requestId,
    });
  const audit = options.audit ?? createNoopAuditSink();

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

  return {
    ...resolved,
    correlationId: request.correlationId,
    request,
    source: {
      component: "http",
      service: "api",
    },
  };
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
  const clerkUserId = context.req.header("x-clerk-user-id");
  const userId = context.req.header("x-user-id");

  if (!clerkUserId && !storeSlug) {
    return null;
  }

  if (!allowsTrustedIdentityHeaders()) {
    throw new HttpContextAuthenticationError(
      "Trusted identity headers are only accepted in local/test.",
    );
  }

  if (!clerkUserId || !storeSlug) {
    throw new HttpContextAuthenticationError(
      "Authenticated HTTP context requires Clerk user and store slug",
    );
  }

  return { clerkUserId, storeSlug, userId };
}

function allowsTrustedIdentityHeaders(): boolean {
  if (process.env.APP_ENV) return process.env.APP_ENV === "local";
  return process.env.NODE_ENV === "test";
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

function readRequestHeaders(context: Context) {
  const requestId = context.req.header("x-request-id") ?? crypto.randomUUID();
  const correlationId = context.req.header("x-correlation-id") ?? requestId;
  const ipAddress =
    context.req.header("x-forwarded-for") ?? context.req.header("x-real-ip");
  const userAgent = context.req.header("user-agent");

  return {
    correlationId,
    method: context.req.method,
    path: context.req.path,
    requestId,
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}
