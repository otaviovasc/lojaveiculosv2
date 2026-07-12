import { describe, expect, it } from "vitest";
import type {
  MarketplaceAccountConnectionStatus,
  MarketplaceServiceErrorCode,
} from "../../ports/marketplaceRepository.js";
import {
  connectionStatusForCode,
  isMarketplaceErrorCode,
  requirementForCode,
  requirementForConnectionStatus,
  safeMessageForCode,
  statusForCode,
  userActionForCode,
} from "./marketplaceAccountPreflightMessages.js";

const expectedByCode = {
  MARKETPLACE_ACCOUNT_NOT_CONNECTED: ["not_connected", 400],
  MARKETPLACE_ACCOUNT_PAUSED: ["paused", 400],
  MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED: ["reconnect_required", 401],
  MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED: ["blocked", 400],
  MARKETPLACE_LISTING_NOT_READY: ["blocked", 400],
  MARKETPLACE_LISTING_NOT_FOUND: ["blocked", 400],
  MARKETPLACE_LISTING_MAPPING_REQUIRED: ["blocked", 400],
  MARKETPLACE_PROVIDER_NOT_CONFIGURED: ["not_configured", 503],
  MARKETPLACE_PROVIDER_CONTRACT_MISSING: ["not_configured", 503],
  MARKETPLACE_PROVIDER_VALIDATION_FAILED: ["blocked", 400],
  MARKETPLACE_PROVIDER_CONFLICT: ["blocked", 400],
  MARKETPLACE_PROVIDER_RATE_LIMITED: ["degraded", 429],
  MARKETPLACE_PROVIDER_UNAVAILABLE: ["degraded", 503],
  MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED: ["blocked", 403],
  MARKETPLACE_TOKEN_REFRESH_FAILED: ["reconnect_required", 401],
  MARKETPLACE_SYNC_JOB_INVALID_METADATA: ["blocked", 400],
  MARKETPLACE_SYNC_JOB_NOT_RETRYABLE: ["blocked", 400],
  MARKETPLACE_SYNC_JOB_STALE: ["blocked", 400],
  MARKETPLACE_SYNC_PARTIAL_FAILURE: ["blocked", 400],
  MARKETPLACE_REQUEST_VALIDATION_FAILED: ["blocked", 400],
} satisfies Record<
  MarketplaceServiceErrorCode,
  readonly [MarketplaceAccountConnectionStatus, number]
>;

describe("marketplace account preflight messages", () => {
  it("recognizes every service error code and maps it to safe metadata", () => {
    for (const [code, [connectionStatus, httpStatus]] of Object.entries(
      expectedByCode,
    ) as Array<
      [
        MarketplaceServiceErrorCode,
        readonly [MarketplaceAccountConnectionStatus, number],
      ]
    >) {
      expect(isMarketplaceErrorCode(code)).toBe(true);
      expect(connectionStatusForCode(code)).toBe(connectionStatus);
      expect(statusForCode(code)).toBe(httpStatus);
      expect(safeMessageForCode(code)).toBeTruthy();
      expect(userActionForCode(code)).toBeTruthy();
      expect(requirementForCode(code)).toMatchObject({
        code,
        severity:
          code === "MARKETPLACE_PROVIDER_RATE_LIMITED" ? "warning" : "blocked",
      });
    }
  });

  it("rejects values outside the service error-code contract", () => {
    expect(isMarketplaceErrorCode("NOT_A_MARKETPLACE_ERROR")).toBe(false);
    expect(isMarketplaceErrorCode("toString")).toBe(false);
    expect(isMarketplaceErrorCode(null)).toBe(false);
  });

  it("only permits provider fallback text for explicitly trusted codes", () => {
    const fallback = "Provider-approved account guidance.";

    expect(
      safeMessageForCode("MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED", fallback),
    ).toBe(fallback);
    expect(
      safeMessageForCode("MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED", fallback),
    ).toBe(fallback);
    expect(safeMessageForCode("MARKETPLACE_LISTING_NOT_READY", fallback)).toBe(
      "Marketplace listing is not ready for synchronization.",
    );
  });

  it("maps every connection status to its account requirement", () => {
    const expectedByStatus = {
      blocked: "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED",
      connected: null,
      degraded: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      not_configured: "MARKETPLACE_PROVIDER_NOT_CONFIGURED",
      not_connected: "MARKETPLACE_ACCOUNT_NOT_CONNECTED",
      paused: "MARKETPLACE_ACCOUNT_PAUSED",
      reconnect_required: "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED",
      refreshable: null,
    } satisfies Record<
      MarketplaceAccountConnectionStatus,
      MarketplaceServiceErrorCode | null
    >;

    for (const [status, expectedCode] of Object.entries(
      expectedByStatus,
    ) as Array<
      [MarketplaceAccountConnectionStatus, MarketplaceServiceErrorCode | null]
    >) {
      expect(requirementForConnectionStatus(status)?.code ?? null).toBe(
        expectedCode,
      );
    }
  });
});
