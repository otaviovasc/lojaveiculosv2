import { serve } from "@hono/node-server";
import { loadLocalEnvBefore } from "./infrastructure/config/loadLocalEnv.js";
import {
  installGracefulShutdown,
  installServerErrorHandler,
  readShutdownTimeoutMs,
} from "./infrastructure/runtime/gracefulShutdown.js";

const [{ createApp }, { createRuntimeAppDependencies }] =
  await loadLocalEnvBefore(() =>
    Promise.all([
      import("./infrastructure/http/createApp.js"),
      import("./infrastructure/db/runtimeRepositories.js"),
    ]),
  );
const port = Number(process.env.PORT ?? 8787);
const runtime = createRuntimeAppDependencies();
const app = createApp(runtime.appOptions);

const server = serve({ fetch: app.fetch, port }, () => {
  console.info(`Lojaveiculos V2 API listening on http://localhost:${port}`);
});
configureHttpServerTimeouts(server, process.env);
installServerErrorHandler({
  resources: runtime.resources,
  server,
});
installGracefulShutdown({
  resources: runtime.resources,
  server,
  shutdownTimeoutMs: readShutdownTimeoutMs(process.env),
});

function configureHttpServerTimeouts(
  server: ReturnType<typeof serve>,
  env: Record<string, string | undefined>,
) {
  const requestTimeoutMs = readPositiveNumber(
    env.HTTP_REQUEST_TIMEOUT_MS,
    240000,
  );
  const configurable = server as {
    headersTimeout?: number;
    requestTimeout?: number;
  };
  configurable.requestTimeout = requestTimeoutMs;
  configurable.headersTimeout = Math.min(requestTimeoutMs, 60000);
}

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
