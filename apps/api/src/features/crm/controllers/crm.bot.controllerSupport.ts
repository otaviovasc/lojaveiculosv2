import type { Context } from "hono";
import {
  crmExternalBotConfigurationReadSchema,
  crmExternalBotProfileAssignmentListSchema,
  crmExternalBotProfileListSchema,
  type CrmExternalBotConfigurationRead,
} from "@lojaveiculosv2/shared";
import type {
  CrmExternalBotProfile,
  CrmExternalBotProfileConnectionAssignment,
} from "../../../domains/crm/ports/crmExternalBotProfileRepository.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  ExternalBotError,
  botError,
} from "../../../domains/crm/bot/externalBotErrors.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import type { CrmExternalBotIntegration } from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";

export function createBotActionContext(
  base: ServiceContext,
  identity: {
    integrationId: string;
    storeId: string;
    tenantId: string;
  },
) {
  return createServiceContext({
    actor: {
      externalId: identity.integrationId,
      id: `external-bot:${identity.integrationId}`,
      kind: "integration",
    },
    audit: base.audit,
    logger: base.logger,
    permissions: ["crm.bot.actions.execute"],
    request: base.request ?? { requestId: base.requestId },
    ...(base.source ? { source: base.source } : {}),
    storeId: identity.storeId,
    tenantId: identity.tenantId,
  });
}

export function toExternalBotConfigurationRead(
  integration: CrmExternalBotIntegration,
): CrmExternalBotConfigurationRead {
  return crmExternalBotConfigurationReadSchema.parse({
    configuration: {
      apiTokenConfigured: integration.apiTokenConfigured,
      createdAt: integration.createdAt?.toISOString() ?? null,
      enabled: integration.enabled,
      id: integration.id,
      secretConfigured: integration.secretConfigured,
      secretUpdatedAt: integration.secretUpdatedAt?.toISOString() ?? null,
      updatedAt: integration.updatedAt?.toISOString() ?? null,
      webhookUrl: integration.webhookUrl,
    },
  });
}

export function toExternalBotProfileList(
  profiles: readonly CrmExternalBotProfile[],
) {
  return crmExternalBotProfileListSchema.parse({
    profiles: profiles.map((profile) => toExternalBotProfileRead(profile)),
  });
}

export function toExternalBotProfileRead(profile: CrmExternalBotProfile) {
  return {
    apiTokenConfigured: profile.apiTokenConfigured,
    createdAt: profile.createdAt?.toISOString() ?? null,
    enabled: profile.enabled,
    id: profile.id,
    isDefault: profile.isDefault,
    name: profile.name,
    secretConfigured: profile.secretConfigured,
    secretUpdatedAt: profile.secretUpdatedAt?.toISOString() ?? null,
    updatedAt: profile.updatedAt?.toISOString() ?? null,
    webhookUrl: profile.webhookUrl,
  };
}

export function toExternalBotProfileAssignments(
  assignments: readonly CrmExternalBotProfileConnectionAssignment[],
) {
  return crmExternalBotProfileAssignmentListSchema.parse({ assignments });
}

export function readProviderOperationId(record: unknown): string | null {
  if (!record || typeof record !== "object") return null;
  if (!("providerOperationId" in record)) return null;
  const value = record.providerOperationId;
  return typeof value === "string" && value.trim() ? value : null;
}

export function bearerCredential(header: string | undefined) {
  const match = /^Bearer\s+(.+)$/i.exec(header?.trim() ?? "");
  if (!match?.[1])
    throw botError(
      "CRM_BOT_UNAUTHORIZED",
      "Bearer credential is required.",
      401,
    );
  return match[1];
}

export function requireManager(manager: ExternalBotManagerPorts | undefined) {
  if (!manager)
    throw botError(
      "CRM_BOT_UNAVAILABLE",
      "External bot manager is unavailable.",
      503,
    );
  return manager;
}

type ValidationIssue = {
  path: readonly PropertyKey[];
  message: string;
};

export async function parseBody<
  Schema extends {
    safeParse(value: unknown): {
      success: boolean;
      data?: unknown;
      error?: { issues: readonly ValidationIssue[] };
    };
  },
>(context: Context, schema: Schema) {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new CrmMessagingValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = (parsed.error?.issues ?? []).map((issue) => ({
      message: issue.message,
      path: issue.path.map(String).join("."),
    }));
    const first = fields[0];
    throw new CrmMessagingValidationError(
      first
        ? `Request body is invalid: ${first.path || "body"} — ${first.message}`
        : "Request body is invalid.",
      fields.length ? { fields } : undefined,
    );
  }
  return parsed.data as ReturnType<Schema["safeParse"]> extends {
    data?: infer Data;
  }
    ? Data
    : never;
}

export async function handleExternalBot(
  context: Context,
  action: () => Promise<Response>,
) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ExternalBotError) {
      return jsonApiError(context, {
        code: error.code,
        error,
        message: error.message,
        retryable: error.status === 503,
        status: error.status,
      });
    }
    return handleCrmMessaging(context, async () => {
      throw error;
    });
  }
}
