import type { ServerType } from "@hono/node-server";

export type GracefulShutdownResource = {
  close: () => Promise<void> | void;
  name: string;
};

export type GracefulShutdownLogger = Pick<Console, "error" | "info" | "warn">;

export type CreateGracefulShutdownOptions = {
  logger?: GracefulShutdownLogger;
  resources?: readonly GracefulShutdownResource[];
  server: ServerType;
  shutdownTimeoutMs?: number;
};

export type InstallGracefulShutdownOptions = CreateGracefulShutdownOptions & {
  exit?: (code: number) => void;
  process?: NodeJS.Process;
  signals?: readonly NodeJS.Signals[];
};

export type InstallServerErrorHandlerOptions = {
  exit?: (code: number) => void;
  logger?: GracefulShutdownLogger;
  resources?: readonly GracefulShutdownResource[];
  server: ServerType;
};

const defaultShutdownTimeoutMs = 10_000;
const defaultSignals: readonly NodeJS.Signals[] = ["SIGTERM", "SIGINT"];

export function createGracefulShutdown(
  options: CreateGracefulShutdownOptions,
): (reason?: string) => Promise<void> {
  let shutdownPromise: Promise<void> | null = null;

  return (reason = "manual") => {
    shutdownPromise ??= shutdownRuntime(reason, options);
    return shutdownPromise;
  };
}

export function installGracefulShutdown(
  options: InstallGracefulShutdownOptions,
) {
  const targetProcess = options.process ?? process;
  const logger = options.logger ?? console;
  const signals = options.signals ?? defaultSignals;
  const shutdown = createGracefulShutdown(options);

  const handlers = signals.map((signal) => {
    const handler = () => {
      void shutdown(signal)
        .then(() => {
          if (options.exit) options.exit(0);
          else targetProcess.exit(0);
        })
        .catch((error: unknown) => {
          logger.error("Graceful shutdown failed.", error);
          if (options.exit) options.exit(1);
          else targetProcess.exit(1);
        });
    };
    targetProcess.once(signal, handler);
    return { handler, signal };
  });

  return {
    shutdown,
    uninstall: () => {
      for (const { handler, signal } of handlers) {
        targetProcess.off(signal, handler);
      }
    },
  };
}

export function installServerErrorHandler(
  options: InstallServerErrorHandlerOptions,
): void {
  const logger = options.logger ?? console;
  const exit = options.exit ?? process.exit;
  const server = options.server as ServerType & {
    on: (event: "error", handler: (error: Error) => void) => void;
  };

  server.on("error", (error) => {
    void closeResources(options.resources ?? [])
      .catch((closeError: unknown) => {
        logger.error(
          "Failed to close runtime resources after server error.",
          closeError,
        );
      })
      .finally(() => {
        logger.error(formatServerError(error));
        exit(1);
      });
  });
}

export function readShutdownTimeoutMs(
  env: Record<string, string | undefined>,
): number {
  const configured = Number(
    env.SHUTDOWN_TIMEOUT_MS ?? defaultShutdownTimeoutMs,
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : defaultShutdownTimeoutMs;
}

async function shutdownRuntime(
  reason: string,
  options: CreateGracefulShutdownOptions,
): Promise<void> {
  const logger = options.logger ?? console;
  const shutdownTimeoutMs =
    options.shutdownTimeoutMs ?? defaultShutdownTimeoutMs;

  logger.info(`Shutting down API runtime (${reason}).`);
  await closeHttpServer(options.server, { logger, shutdownTimeoutMs });
  await closeResources(options.resources ?? []);
  logger.info("API runtime shutdown complete.");
}

async function closeHttpServer(
  server: ServerType,
  {
    logger,
    shutdownTimeoutMs,
  }: {
    logger: GracefulShutdownLogger;
    shutdownTimeoutMs: number;
  },
): Promise<void> {
  const closePromise = new Promise<void>((resolve, reject) => {
    const close = server.close as (
      callback?: (error?: Error) => void,
    ) => ServerType;
    close.call(server, (error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  closeIdleConnections(server);

  const closedGracefully = await settlesBefore(closePromise, shutdownTimeoutMs);
  if (closedGracefully) return;

  logger.warn(
    `HTTP server did not close within ${shutdownTimeoutMs}ms; forcing open connections closed.`,
  );
  closeAllConnections(server);

  const closedAfterForce = await settlesBefore(closePromise, 1_000);
  if (!closedAfterForce) {
    throw new Error("Timed out waiting for HTTP server shutdown.");
  }
}

async function closeResources(
  resources: readonly GracefulShutdownResource[],
): Promise<void> {
  const failures: Error[] = [];

  for (const resource of [...resources].reverse()) {
    try {
      await resource.close();
    } catch (error) {
      failures.push(
        new Error(`Failed to close shutdown resource ${resource.name}.`, {
          cause: error,
        }),
      );
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, "Failed to close shutdown resources.");
  }
}

async function settlesBefore(
  promise: Promise<void>,
  timeoutMs: number,
): Promise<boolean> {
  return Promise.race([promise.then(() => true), delay(timeoutMs)]);
}

async function delay(timeoutMs: number): Promise<false> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    timer.unref?.();
  });
}

function closeIdleConnections(server: ServerType): void {
  const candidate = server as ServerType & {
    closeIdleConnections?: () => void;
  };
  candidate.closeIdleConnections?.();
}

function closeAllConnections(server: ServerType): void {
  const candidate = server as ServerType & {
    closeAllConnections?: () => void;
  };
  candidate.closeAllConnections?.();
}

function formatServerError(error: Error): string {
  const nodeError = error as NodeJS.ErrnoException;
  const port = (nodeError as { port?: unknown }).port;
  if (nodeError.code === "EADDRINUSE" && port) {
    return `API failed to start: port ${String(port)} is already in use.`;
  }
  return `API server error: ${error.message}`;
}
