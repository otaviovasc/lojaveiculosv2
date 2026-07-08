import type {
  MarketplaceAccount,
  MarketplaceAccountConnectionStatus,
  MarketplaceAccountRequirement,
  MarketplaceProvider,
  MarketplaceServiceErrorCode,
} from "../../ports/marketplaceRepository.js";
import type {
  MarketplaceProviderGatewayRegistry,
  MarketplaceTokenSet,
} from "../../ports/marketplaceProviderGateway.js";
import { MarketplaceServiceError } from "./marketplaceErrors.js";
import {
  connectionStatusForCode,
  isMarketplaceErrorCode,
  requirementForCode,
  requirementForConnectionStatus,
  safeMessageForCode,
  statusForCode,
  userActionForCode,
} from "./marketplaceAccountPreflightMessages.js";

export type MarketplaceAccountPreflight = {
  accountId: string | null;
  requirements: MarketplaceAccountRequirement[];
  status: MarketplaceAccountConnectionStatus;
};

export async function checkMarketplaceAccountPreflight(input: {
  account: MarketplaceAccount | null;
  gatewayRegistry?: MarketplaceProviderGatewayRegistry;
  provider: MarketplaceProvider;
}): Promise<MarketplaceAccountPreflight> {
  const localBlocker = localAccountBlocker(input.account, input.provider);
  if (localBlocker) return localBlocker;

  const account = input.account;
  if (!account) return notConnected(input.provider);

  let token: MarketplaceTokenSet;
  try {
    token = readMarketplaceAccountToken(account, input.provider);
  } catch (error) {
    return preflightFromError(error, input.provider);
  }

  if (!input.gatewayRegistry) {
    return preflightFromCode("MARKETPLACE_PROVIDER_NOT_CONFIGURED");
  }

  try {
    const gateway = input.gatewayRegistry.getGateway(input.provider);
    const status = await gateway.checkAccount({ token });
    return {
      accountId: status.accountId,
      requirements: normalizeRequirements(status.requirements),
      status: status.status,
    };
  } catch (error) {
    return preflightFromError(error, input.provider);
  }
}

export async function assertMarketplaceAccountPreflightReady(input: {
  account: MarketplaceAccount | null;
  gatewayRegistry?: MarketplaceProviderGatewayRegistry;
  provider: MarketplaceProvider;
}) {
  const preflight = await checkMarketplaceAccountPreflight(input);
  const blocker =
    preflight.requirements.find(
      (requirement) => requirement.severity === "blocked",
    ) ?? requirementForConnectionStatus(preflight.status);
  if (!blocker) return;
  throw new MarketplaceServiceError({
    code: blocker.code,
    details: { provider: input.provider },
    message: blocker.message,
    provider: input.provider,
    status: statusForCode(blocker.code),
    userAction: blocker.userAction,
  });
}

export function readMarketplaceAccountToken(
  account: MarketplaceAccount,
  provider: MarketplaceProvider,
): MarketplaceTokenSet {
  const credentials = readObject(account.config.credentials);
  const connection = readObject(account.config.connection);
  const accessToken = readString(credentials.accessToken);
  if (!accessToken) {
    throw new MarketplaceServiceError({
      code: "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED",
      details: { provider },
      message: "Marketplace account token is missing.",
      provider,
      status: 400,
      userAction: "Reconnect the marketplace account before syncing stock.",
    });
  }
  return {
    accessToken,
    expiresAt: readDate(connection.expiresAt),
    providerAccountId: readString(connection.providerAccountId),
    refreshToken: readString(credentials.refreshToken),
    scope: readString(connection.scope),
    tokenType: readString(connection.tokenType),
  };
}

function localAccountBlocker(
  account: MarketplaceAccount | null,
  provider: MarketplaceProvider,
): MarketplaceAccountPreflight | null {
  if (!account) return notConnected(provider);
  if (account.status === "inactive") {
    return preflightFromCode("MARKETPLACE_ACCOUNT_PAUSED");
  }
  if (account.status === "error") {
    return preflightFromCode("MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED");
  }
  return null;
}

function notConnected(
  _provider: MarketplaceProvider,
): MarketplaceAccountPreflight {
  return preflightFromCode("MARKETPLACE_ACCOUNT_NOT_CONNECTED");
}

function preflightFromError(
  error: unknown,
  provider: MarketplaceProvider,
): MarketplaceAccountPreflight {
  if (error instanceof MarketplaceServiceError) {
    return preflightFromCode(error.code);
  }
  const code = readMarketplaceErrorCode(error);
  return preflightFromCode(
    code ?? "MARKETPLACE_PROVIDER_NOT_CONFIGURED",
    provider,
  );
}

function preflightFromCode(
  code: MarketplaceServiceErrorCode,
  _provider?: MarketplaceProvider,
): MarketplaceAccountPreflight {
  return {
    accountId: null,
    requirements: [requirementForCode(code)],
    status: connectionStatusForCode(code),
  };
}

function normalizeRequirements(
  requirements: readonly MarketplaceAccountRequirement[],
) {
  return requirements.map((requirement) => ({
    code: requirement.code,
    message: safeMessageForCode(requirement.code, requirement.message),
    severity: requirement.severity,
    userAction: requirement.userAction || userActionForCode(requirement.code),
  }));
}

function readMarketplaceErrorCode(
  error: unknown,
): MarketplaceServiceErrorCode | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as Record<string, unknown>).code;
  return isMarketplaceErrorCode(code) ? code : null;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readDate(value: unknown): Date | null {
  const raw = readString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
