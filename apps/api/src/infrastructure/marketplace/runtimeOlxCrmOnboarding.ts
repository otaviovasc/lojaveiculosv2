import type { MarketplaceOlxCrmOnboarding } from "../../domains/marketplace/ports/marketplaceOlxCrmOnboarding.js";
import {
  assertEntitlement,
  assertPermission,
} from "../../shared/authorization.js";
import type { StoreScopedServiceContext } from "../../shared/serviceContext.js";
import {
  externalAccountAuthorizationCapabilities,
  externalAccountAuthorizations,
  crmChannelRoutingPolicies,
  providerConnections,
} from "@lojaveiculosv2/db";
import { isNull } from "drizzle-orm";
import { onboardOlxCrmConnection } from "../../domains/crm/services/CrmService/onboardOlxCrmConnection.js";
import { OLX_CRM_CONNECTION_SETUP_PERMISSION } from "../../domains/crm/onboardOlxCrmConnectionSupport.js";
import { createCrmConnectionCredentialVault } from "../crm/crmConnectionCredentialVault.js";
import { createOlxCrmWebhookSetupProvider } from "../crm/olxCrmWebhookSetupProvider.js";
import { createDrizzleCrmConnectionRepository } from "../db/crm/drizzleCrmConnectionRepository.js";
import type { DrizzleCrmClient } from "../db/crm/drizzleCrmRepository.js";
import {
  olxProviderConnectionMetadata,
  recordOlxDefaultOutcome,
} from "./runtimeOlxCrmOnboardingSupport.js";

export function createRuntimeOlxCrmOnboarding(
  db: DrizzleCrmClient,
  env: Record<string, string | undefined>,
): MarketplaceOlxCrmOnboarding {
  const canonicalApiOrigin = readCanonicalOrigin(env);
  const ports = {
    crmConnectionCredentialVault: createCrmConnectionCredentialVault(env),
    crmConnectionRepository: createDrizzleCrmConnectionRepository(db),
    crmRepository: {} as never,
    olxCrmWebhookSetupProvider: createOlxCrmWebhookSetupProvider(),
  };
  return {
    onboard: (context, input) =>
      onboardOlxCrmConnection(context, { ...input, canonicalApiOrigin }, ports),
    persistCapabilities: async (context, input) => {
      assertPermission(context, OLX_CRM_CONNECTION_SETUP_PERMISSION);
      assertEntitlement(context as StoreScopedServiceContext, "crm");
      if (
        context.storeId !== input.storeId ||
        context.tenantId !== input.tenantId
      ) {
        throw new Error("OLX capability persistence scope binding mismatch.");
      }
      const scopeState = readScopeState(input);
      const chatReady = input.capabilities.chat.status === "active";
      const canCreateDefault = context.permissions.includes(
        "crm.routing.default.manage",
      );
      const operationalCapabilities = Object.fromEntries(
        Object.entries(input.capabilities).map(([name, capability]) => [
          name,
          { reason: capability.reason, status: capability.status },
        ]),
      );
      if (chatReady && canCreateDefault && input.connectionId) {
        await recordOlxDefaultOutcome(
          context,
          { ...input, connectionId: input.connectionId },
          "attempted",
        );
      }
      const connectionMetadata = olxProviderConnectionMetadata(
        input.capabilities.chat,
      );
      let defaultCreated = false;
      await db.transaction(async (transaction) => {
        await transaction
          .insert(externalAccountAuthorizations)
          .values({
            authorizationState: "authorized",
            broker: "direct",
            externalAccountId: input.providerAccountId,
            grantedScopes: [...input.grantedScopes],
            id: input.authorizationId,
            metadata: { operationalCapabilities, source: "marketplace_oauth" },
            provider: "olx",
            requestedScopes: [...input.requestedScopes],
            scopeState,
            storeId: input.storeId,
            tenantId: input.tenantId,
          })
          .onConflictDoUpdate({
            set: {
              authorizationState: "authorized",
              externalAccountId: input.providerAccountId,
              grantedScopes: [...input.grantedScopes],
              metadata: {
                operationalCapabilities,
                source: "marketplace_oauth",
              },
              requestedScopes: [...input.requestedScopes],
              scopeState,
              updatedAt: new Date(),
            },
            target: externalAccountAuthorizations.id,
          });
        for (const capability of Object.values(input.capabilities)) {
          await transaction
            .insert(externalAccountAuthorizationCapabilities)
            .values({
              authorizationId: input.authorizationId,
              capability: capability.capability,
              state: capability.grantState,
              stateReason:
                capability.grantState === "denied" ? capability.reason : null,
              storeId: input.storeId,
              tenantId: input.tenantId,
            })
            .onConflictDoUpdate({
              set: {
                state: capability.grantState,
                stateReason:
                  capability.grantState === "denied" ? capability.reason : null,
                updatedAt: new Date(),
              },
              target: [
                externalAccountAuthorizationCapabilities.authorizationId,
                externalAccountAuthorizationCapabilities.capability,
              ],
            });
        }
        if (input.connectionId) {
          await transaction
            .insert(providerConnections)
            .values({
              authorizationId: input.authorizationId,
              broker: "direct",
              channel: "olx_chat",
              displayName: "OLX Chat",
              externalConnectionId: input.providerAccountId,
              id: input.connectionId,
              metadata: connectionMetadata,
              provider: "olx",
              state: providerConnectionState(input.capabilities.chat.status),
              storeId: input.storeId,
              tenantId: input.tenantId,
            })
            .onConflictDoUpdate({
              set: {
                authorizationId: input.authorizationId,
                externalConnectionId: input.providerAccountId,
                metadata: connectionMetadata,
                state: providerConnectionState(input.capabilities.chat.status),
                updatedAt: new Date(),
              },
              target: providerConnections.id,
            });
          if (chatReady && canCreateDefault) {
            const inserted = await transaction
              .insert(crmChannelRoutingPolicies)
              .values({
                botConnectionId: null,
                botMode: "disabled",
                channel: "olx_chat",
                defaultConnectionId: input.connectionId,
                storeId: input.storeId,
                tenantId: input.tenantId,
              })
              .onConflictDoUpdate({
                set: {
                  defaultConnectionId: input.connectionId,
                  updatedAt: new Date(),
                },
                setWhere: isNull(crmChannelRoutingPolicies.defaultConnectionId),
                target: [
                  crmChannelRoutingPolicies.tenantId,
                  crmChannelRoutingPolicies.storeId,
                  crmChannelRoutingPolicies.channel,
                ],
              })
              .returning({ id: crmChannelRoutingPolicies.id });
            defaultCreated = inserted.length > 0;
          }
        }
      });
      if (defaultCreated && input.connectionId) {
        await recordOlxDefaultOutcome(
          context,
          { ...input, connectionId: input.connectionId },
          "succeeded",
        );
      }
    },
  };
}

function readScopeState(input: {
  grantedScopes: readonly string[];
  requestedScopes: readonly string[];
}) {
  return input.requestedScopes.every((scope) =>
    input.grantedScopes.includes(scope),
  )
    ? ("granted" as const)
    : input.grantedScopes.length
      ? ("partial" as const)
      : ("denied" as const);
}

function providerConnectionState(status: "active" | "blocked" | "error") {
  if (status === "active") return "active" as const;
  if (status === "error") return "error" as const;
  return "paused" as const;
}

function readCanonicalOrigin(env: Record<string, string | undefined>) {
  const configured = env.PUBLIC_APP_URL?.trim();
  if (
    !configured &&
    (env.APP_ENV === "local" ||
      env.NODE_ENV === "test" ||
      env.NODE_ENV === "development")
  ) {
    return "http://localhost:8787";
  }
  if (!configured)
    throw new Error("PUBLIC_APP_URL is required for OLX CRM callbacks.");
  const url = new URL(configured);
  if (
    url.protocol !== "https:" &&
    env.APP_ENV !== "local" &&
    env.NODE_ENV !== "test"
  )
    throw new Error("OLX CRM callbacks require an HTTPS PUBLIC_APP_URL.");
  return url.origin;
}
