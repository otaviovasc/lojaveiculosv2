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
installServerErrorHandler({
  resources: runtime.resources,
  server,
});
installGracefulShutdown({
  resources: runtime.resources,
  server,
  shutdownTimeoutMs: readShutdownTimeoutMs(process.env),
});
