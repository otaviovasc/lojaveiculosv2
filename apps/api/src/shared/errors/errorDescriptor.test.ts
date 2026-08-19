import { describe, expect, it } from "vitest";
import {
  describeError,
  IntegrationError,
  sanitizeDiagnosticMetadata,
  sanitizeDiagnosticString,
  toSafeErrorMetadata,
} from "./errorDescriptor.js";

describe("error descriptors", () => {
  it("projects integration failures into stable safe metadata", () => {
    const error = new IntegrationError("Provider is not configured.", {
      attemptState: "not_attempted",
      boundary: "provider_configuration",
      code: "INTEGRATION_NOT_CONFIGURED",
      httpStatus: 503,
      kind: "configuration",
      operation: "plate_lookup",
      phase: "configuration",
      provider: "apibrasil",
      retryable: false,
      safeDetails: { missingConfiguration: ["API_PLACA_KEY"] },
    });

    expect(describeError(error)).toMatchObject({
      attemptState: "not_attempted",
      code: "INTEGRATION_NOT_CONFIGURED",
      provider: "apibrasil",
    });
    expect(toSafeErrorMetadata(error)).toEqual({
      errorBoundary: "provider_configuration",
      errorCode: "INTEGRATION_NOT_CONFIGURED",
      errorDetails: { missingConfiguration: ["API_PLACA_KEY"] },
      errorKind: "configuration",
      errorName: "IntegrationError",
      httpStatus: 503,
      providerAttemptState: "not_attempted",
      providerName: "apibrasil",
      providerOperation: "plate_lookup",
      providerPhase: "configuration",
      retryable: false,
    });
  });

  it("does not expose messages from unexpected errors", () => {
    const metadata = toSafeErrorMetadata(
      new Error("database failed with password=do-not-log"),
    );

    expect(metadata).toMatchObject({
      errorCode: "UNEXPECTED_ERROR",
      errorKind: "unexpected",
      errorName: "Error",
    });
    expect(JSON.stringify(metadata)).not.toContain("do-not-log");
  });

  it("reports a safe nested driver code without exposing its message", () => {
    const cause = Object.assign(
      new TypeError("password=do-not-log and token=also-secret"),
      { code: "ERR_INVALID_ARG_TYPE" },
    );
    const metadata = toSafeErrorMetadata(new Error("Failed query", { cause }));

    expect(metadata).toMatchObject({
      errorCauseCode: "ERR_INVALID_ARG_TYPE",
      errorCauseName: "TypeError",
    });
    expect(JSON.stringify(metadata)).not.toContain("do-not-log");
    expect(JSON.stringify(metadata)).not.toContain("also-secret");
  });

  it("redacts sensitive keys and credential-like string values", () => {
    const metadata = sanitizeDiagnosticMetadata({
      authorization: "Bearer abc",
      nested: {
        apiKey: "key-value",
        endpoint: "https://example.test/path?token=secret-value",
      },
      note: "Request used Bearer private-token",
    });

    expect(metadata).toEqual({
      authorization: "[redacted]",
      nested: {
        apiKey: "[redacted]",
        endpoint: "https://example.test/path?token=[redacted]",
      },
      note: "Request used Bearer [redacted]",
    });
    expect(sanitizeDiagnosticString("sk_live_123456789")).toBe(
      "[redacted-api-key]",
    );
  });
});
