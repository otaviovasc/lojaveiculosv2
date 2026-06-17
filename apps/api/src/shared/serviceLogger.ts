import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";

export type ServiceLogMetadata = SafeAuditMetadata;

export type ServiceLogger = {
  child?: (metadata: ServiceLogMetadata) => ServiceLogger;
  error: (message: string, metadata?: ServiceLogMetadata) => void;
  info: (message: string, metadata?: ServiceLogMetadata) => void;
  warn: (message: string, metadata?: ServiceLogMetadata) => void;
};

export function createNoopServiceLogger(): ServiceLogger {
  return {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined,
  };
}

export function createConsoleServiceLogger(
  baseMetadata: ServiceLogMetadata = {},
): ServiceLogger {
  const write = (
    level: "error" | "info" | "warn",
    message: string,
    metadata: ServiceLogMetadata = {},
  ) => {
    console[level](message, { ...baseMetadata, ...metadata });
  };

  return {
    child: (metadata) =>
      createConsoleServiceLogger({ ...baseMetadata, ...metadata }),
    error: (message, metadata) => write("error", message, metadata),
    info: (message, metadata) => write("info", message, metadata),
    warn: (message, metadata) => write("warn", message, metadata),
  };
}
