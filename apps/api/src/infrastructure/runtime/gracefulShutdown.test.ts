import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  createGracefulShutdown,
  installGracefulShutdown,
  installServerErrorHandler,
} from "./gracefulShutdown.js";

describe("createGracefulShutdown", () => {
  it("closes the HTTP server before runtime resources and only runs once", async () => {
    const events: string[] = [];
    const fakeServer = createFakeServer({
      close: (done) => {
        events.push("server.close");
        queueMicrotask(done);
      },
    });
    const resource = {
      close: vi.fn(async () => {
        events.push("resource.close");
      }),
      name: "db",
    };
    const shutdown = createGracefulShutdown({
      logger: silentLogger(),
      resources: [resource],
      server: fakeServer.server,
      shutdownTimeoutMs: 50,
    });

    await Promise.all([shutdown("test"), shutdown("test")]);

    expect(fakeServer.close).toHaveBeenCalledOnce();
    expect(fakeServer.closeIdleConnections).toHaveBeenCalledOnce();
    expect(resource.close).toHaveBeenCalledOnce();
    expect(events).toEqual(["server.close", "resource.close"]);
  });

  it("forces open HTTP connections when graceful close exceeds the timeout", async () => {
    let closeCallback: (() => void) | null = null;
    const fakeServer = createFakeServer({
      close: (done) => {
        closeCallback = done;
      },
      closeAllConnections: () => {
        closeCallback?.();
      },
    });
    const logger = silentLogger();
    const shutdown = createGracefulShutdown({
      logger,
      server: fakeServer.server,
      shutdownTimeoutMs: 1,
    });

    await shutdown("timeout-test");

    expect(fakeServer.closeAllConnections).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("uses an injected exit callback without falling through to process.exit", async () => {
    const fakeServer = createFakeServer({
      close: (done) => queueMicrotask(done),
    });
    const fakeProcess = new EventEmitter() as NodeJS.Process;
    fakeProcess.exit = vi.fn() as never;
    const exit = vi.fn();

    installGracefulShutdown({
      exit,
      logger: silentLogger(),
      process: fakeProcess,
      server: fakeServer.server,
      shutdownTimeoutMs: 50,
    });

    fakeProcess.emit("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(exit).toHaveBeenCalledWith(0);
    expect(fakeProcess.exit).not.toHaveBeenCalled();
  });

  it("closes resources and exits cleanly when the HTTP server emits a bind error", async () => {
    const server = new EventEmitter();
    const exit = vi.fn();
    const logger = silentLogger();
    const resource = {
      close: vi.fn(async () => undefined),
      name: "db",
    };

    installServerErrorHandler({
      exit,
      logger,
      resources: [resource],
      server: server as never,
    });
    server.emit(
      "error",
      Object.assign(new Error("address in use"), {
        code: "EADDRINUSE",
        port: 8787,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(resource.close).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      "API failed to start: port 8787 is already in use.",
    );
    expect(exit).toHaveBeenCalledWith(1);
  });
});

function createFakeServer(options: {
  close: (done: () => void) => void;
  closeAllConnections?: () => void;
}) {
  const close = vi.fn((done?: () => void) => {
    options.close(() => done?.());
    return undefined;
  });
  const closeAllConnections = vi.fn(() => {
    options.closeAllConnections?.();
  });
  const closeIdleConnections = vi.fn();

  return {
    close,
    closeAllConnections,
    closeIdleConnections,
    server: {
      close,
      closeAllConnections,
      closeIdleConnections,
    } as never,
  };
}

function silentLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
}
