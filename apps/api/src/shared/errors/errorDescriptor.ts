import type {
  SafeAuditMetadata,
  SafeAuditMetadataValue,
} from "@lojaveiculosv2/audit";

export type ErrorKind =
  | "authorization"
  | "configuration"
  | "invalid_response"
  | "network"
  | "persistence"
  | "provider_rejected"
  | "timeout"
  | "unexpected"
  | "validation";

export type IntegrationAttemptState =
  "attempted" | "failed" | "indeterminate" | "not_attempted";

export type ErrorDescriptor = {
  boundary: string;
  code: string;
  httpStatus: number;
  kind: ErrorKind;
  operation?: string;
  phase?: string;
  provider?: string;
  providerStatus?: number;
  retryable: boolean;
  safeDetails?: SafeAuditMetadata;
  attemptState?: IntegrationAttemptState;
};

export class IntegrationError extends Error {
  readonly descriptor: ErrorDescriptor;

  constructor(message: string, descriptor: ErrorDescriptor) {
    super(message);
    this.name = "IntegrationError";
    this.descriptor = {
      ...descriptor,
      ...(descriptor.safeDetails
        ? { safeDetails: sanitizeDiagnosticMetadata(descriptor.safeDetails) }
        : {}),
    };
  }
}

export type ErrorDescriptorFallback = {
  boundary?: string;
  code?: string;
  httpStatus?: number;
};

export function describeError(
  error: unknown,
  fallback: ErrorDescriptorFallback = {},
): ErrorDescriptor {
  if (error instanceof IntegrationError) return error.descriptor;

  return {
    boundary: fallback.boundary ?? "unknown",
    code: fallback.code ?? "UNEXPECTED_ERROR",
    httpStatus: fallback.httpStatus ?? 500,
    kind: "unexpected",
    retryable: false,
    safeDetails: {
      errorName:
        error instanceof Error
          ? sanitizeDiagnosticString(error.name)
          : "UnknownError",
    },
  };
}

export function toSafeErrorMetadata(
  error: unknown,
  fallback?: ErrorDescriptorFallback,
): SafeAuditMetadata {
  const descriptor = describeError(error, fallback);
  return {
    errorBoundary: descriptor.boundary,
    errorCode: descriptor.code,
    errorKind: descriptor.kind,
    errorName:
      error instanceof Error
        ? sanitizeDiagnosticString(error.name)
        : "UnknownError",
    httpStatus: descriptor.httpStatus,
    retryable: descriptor.retryable,
    ...(descriptor.attemptState
      ? { providerAttemptState: descriptor.attemptState }
      : {}),
    ...(descriptor.operation
      ? { providerOperation: descriptor.operation }
      : {}),
    ...(descriptor.phase ? { providerPhase: descriptor.phase } : {}),
    ...(descriptor.provider ? { providerName: descriptor.provider } : {}),
    ...(descriptor.providerStatus !== undefined
      ? { providerStatus: descriptor.providerStatus }
      : {}),
    ...(descriptor.safeDetails ? { errorDetails: descriptor.safeDetails } : {}),
  };
}

export function sanitizeDiagnosticMetadata(
  metadata: Readonly<Record<string, unknown>>,
): SafeAuditMetadata {
  return sanitizeRecord(metadata, 0);
}

export function sanitizeDiagnosticString(
  value: string,
  maxLength = 1_000,
): string {
  return value
    .slice(0, maxLength)
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bsk[-_][A-Za-z0-9_-]{8,}\b/g, "[redacted-api-key]")
    .replace(
      /((?:api[_-]?key|token|secret|password)\s*[=:]\s*)[^\s&,;]+/gi,
      "$1[redacted]",
    );
}

const sensitiveKey =
  /authorization|cookie|credential|password|secret|token|api[_-]?key/i;

function sanitizeRecord(
  record: Readonly<Record<string, unknown>>,
  depth: number,
): SafeAuditMetadata {
  return Object.fromEntries(
    Object.entries(record)
      .slice(0, 30)
      .filter((entry) => entry[1] !== undefined)
      .map(([key, value]) => [
        key,
        sensitiveKey.test(key) ? "[redacted]" : sanitizeValue(value, depth + 1),
      ]),
  );
}

function sanitizeValue(value: unknown, depth: number): SafeAuditMetadataValue {
  if (depth > 4) return "[truncated]";
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }
  if (typeof value === "string") return sanitizeDiagnosticString(value);
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    return sanitizeRecord(value as Record<string, unknown>, depth);
  }
  return String(value);
}
