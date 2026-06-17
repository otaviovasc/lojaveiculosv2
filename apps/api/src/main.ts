import { serve } from "@hono/node-server";
import { createApp } from "./infrastructure/http/createApp.js";
import { loadLocalEnv } from "./infrastructure/config/loadLocalEnv.js";
import { createRuntimeAppOptions } from "./infrastructure/db/runtimeRepositories.js";

loadLocalEnv();
const port = Number(process.env.PORT ?? 8787);
const app = createApp(createRuntimeAppOptions());

serve({ fetch: app.fetch, port });
