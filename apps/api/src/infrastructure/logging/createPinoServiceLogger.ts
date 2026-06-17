import pino from "pino";
import type { Logger } from "pino";
import type {
  ServiceLogMetadata,
  ServiceLogger,
} from "../../shared/serviceContext.js";

export function createPinoServiceLogger(input?: {
  baseMetadata?: ServiceLogMetadata;
  logger?: Logger;
}): ServiceLogger {
  const logger = input?.logger ?? pino();
  const baseMetadata = input?.baseMetadata ?? {};

  const write = (
    level: "error" | "info" | "warn",
    message: string,
    metadata: ServiceLogMetadata = {},
  ) => {
    logger[level]({ ...baseMetadata, ...metadata }, message);
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
