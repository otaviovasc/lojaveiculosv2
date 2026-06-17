import { serve } from "@hono/node-server";
import { createApp } from "./infrastructure/http/createApp.js";

const port = Number(process.env.PORT ?? 8787);
const app = createApp();

serve({ fetch: app.fetch, port });
