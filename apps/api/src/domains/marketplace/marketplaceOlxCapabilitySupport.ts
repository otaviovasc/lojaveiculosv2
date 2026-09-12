import {
  assertEntitlement,
  AuthorizationError,
} from "../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../shared/serviceContext.js";
import type {
  OlxCapabilityResult,
  OlxCrmOnboardingResult,
} from "./ports/marketplaceOlxCrmOnboarding.js";
import type { MarketplaceOAuthTransaction } from "./ports/marketplaceOAuthStateStore.js";
import type { MarketplaceServicePorts } from "./services/MarketplaceService/serviceSupport.js";

export async function resolveOlxCapabilities(
  context: ServiceContext,
  transaction: MarketplaceOAuthTransaction,
  accessToken: string,
  providerAccountId: string | null,
  scopes: string[],
  ports: MarketplaceServicePorts,
): Promise<{
  capabilities: {
    chat: OlxCapabilityResult;
    leads: OlxCapabilityResult;
    stock: OlxCapabilityResult;
  };
  connectionId: string | null;
  crmStatus: OlxCrmOnboardingResult["status"] | "blocked";
}> {
  const stock = scopeCapability(scopes, "autoupload", "inventory_sync");
  const crmAccess =
    context.permissions.includes("crm.messaging.connection.setup") &&
    hasEntitlement(context, "crm");
  if (!crmAccess) {
    return {
      capabilities: {
        chat: accessCapability(scopes, "chat", "messaging"),
        leads: accessCapability(scopes, "autoservice", "lead_ingestion"),
        stock,
      },
      connectionId: null,
      crmStatus: "blocked",
    };
  }
  if (!ports.olxCrmOnboarding) {
    return {
      capabilities: {
        chat: unavailableCapability(scopes, "chat", "messaging"),
        leads: unavailableCapability(scopes, "autoservice", "lead_ingestion"),
        stock,
      },
      connectionId: null,
      crmStatus: "error",
    };
  }
  try {
    const crm = await ports.olxCrmOnboarding.onboard(context, {
      accessToken,
      providerAccountId,
      scopes,
      storeId: transaction.storeId,
      tenantId: transaction.tenantId,
    });
    return {
      capabilities: { ...crm.capabilities, stock },
      connectionId: crm.connectionId,
      crmStatus: crm.status,
    };
  } catch {
    return {
      capabilities: {
        chat: unavailableCapability(scopes, "chat", "messaging"),
        leads: unavailableCapability(scopes, "autoservice", "lead_ingestion"),
        stock,
      },
      connectionId: null,
      crmStatus: "error",
    };
  }
}

export function olxScopeState(input: {
  capabilities: Record<string, OlxCapabilityResult>;
}) {
  const grants = Object.values(input.capabilities).map(
    ({ grantState }) => grantState,
  );
  return grants.every((state) => state === "granted")
    ? "granted"
    : grants.some((state) => state === "granted")
      ? "partial"
      : "denied";
}

export function normalizedScopes(value: string | null): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(/[\s,]+/u)
        .map((scope) => scope.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].sort();
}

function hasEntitlement(
  context: ServiceContext,
  entitlement: StoreScopedServiceContext["entitlements"][number],
) {
  if (
    !context.storeId ||
    !context.tenantId ||
    !("entitlements" in context) ||
    !Array.isArray(context.entitlements)
  ) {
    return false;
  }
  const scopedContext: StoreScopedServiceContext = {
    ...context,
    entitlements: context.entitlements,
    storeId: context.storeId,
    tenantId: context.tenantId,
  };
  try {
    assertEntitlement(scopedContext, entitlement);
    return true;
  } catch (error) {
    if (error instanceof AuthorizationError) return false;
    throw error;
  }
}

function scopeCapability(
  scopes: readonly string[],
  scope: string,
  capability: OlxCapabilityResult["capability"],
): OlxCapabilityResult {
  return scopes.includes(scope)
    ? {
        capability,
        grantState: "granted",
        reason: null,
        status: "active",
      }
    : {
        capability,
        grantState: "denied",
        reason: "missing_scope",
        status: "blocked",
      };
}

function accessCapability(
  scopes: readonly string[],
  scope: string,
  capability: OlxCapabilityResult["capability"],
): OlxCapabilityResult {
  return scopes.includes(scope)
    ? {
        capability,
        grantState: "granted",
        reason: "access_denied",
        status: "blocked",
      }
    : scopeCapability(scopes, scope, capability);
}

function unavailableCapability(
  scopes: readonly string[],
  scope: string,
  capability: OlxCapabilityResult["capability"],
): OlxCapabilityResult {
  return scopes.includes(scope)
    ? {
        capability,
        grantState: "granted",
        reason: "runtime_unavailable",
        status: "error",
      }
    : scopeCapability(scopes, scope, capability);
}
