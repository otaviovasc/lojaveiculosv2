import pino from "pino";
import type { Logger } from "pino";
import type {
  ServiceLogMetadata,
  ServiceLogger,
} from "../../shared/serviceContext.js";
import { observabilitySchemas } from "../../shared/observabilityOntology.js";

export function createPinoServiceLogger(input?: {
  baseMetadata?: ServiceLogMetadata;
  logger?: Logger;
}): ServiceLogger {
  const logger =
    input?.logger ?? pino({ level: process.env.LOG_LEVEL ?? "info" });
  const baseMetadata = input?.baseMetadata ?? {};

  const write = (
    level: "error" | "info" | "warn",
    message: string,
    metadata: ServiceLogMetadata = {},
  ) => {
    logger[level](
      {
        ...metadata,
        ...baseMetadata,
        event: message,
        schema: observabilitySchemas.serviceLog,
        timestamp: new Date().toISOString(),
      },
      message,
    );
  };

  return {
    child: (metadata) =>
      createPinoServiceLogger({
        baseMetadata: { ...baseMetadata, ...metadata },
        logger,
      }),
    error: (message, metadata) => write("error", message, metadata),
    info: (message, metadata) => write("info", message, metadata),
    warn: (message, metadata) => write("warn", message, metadata),
  };
}
