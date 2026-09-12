import { sanitizeDiagnosticString } from "../../../shared/errors/errorDescriptor.js";

export type CrmPushWorkerErrorMetadata = {
  errorCauseName?: string;
  errorCode?: string;
  errorMessage: string;
  errorName: string;
};

export function toCrmPushWorkerErrorMetadata(
  error: unknown,
): CrmPushWorkerErrorMetadata {
  const outerError = normalizeError(error);
  const diagnosticError = deepestErrorCause(outerError);
  const errorCode = readErrorCode(diagnosticError);
  return {
    ...(diagnosticError !== outerError
      ? {
          errorCauseName: sanitizeDiagnosticString(diagnosticError.name, 100),
        }
      : {}),
    ...(errorCode ? { errorCode } : {}),
    errorMessage: sanitizeDiagnosticString(diagnosticError.message, 500),
    errorName: sanitizeDiagnosticString(outerError.name, 100),
  };
}

function deepestErrorCause(error: Error): Error {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!(current.cause instanceof Error)) return current;
    current = current.cause;
  }
  return current;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function readErrorCode(error: Error): string | undefined {
  const code = (error as Error & { code?: unknown }).code;
  return typeof code === "string"
    ? sanitizeDiagnosticString(code, 100)
    : undefined;
}
