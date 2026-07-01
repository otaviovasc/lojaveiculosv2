import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { ensureHttpRequestId } from "./requestMetadata.js";

export function installHttpMiddleware(app: Hono): void {
  app.use(
    "*",
    async (context, next) => {
      const requestId = ensureHttpRequestId(context);
      await next();
      context.header("X-Request-Id", requestId);
    },
    secureHeaders(),
    cors({
      allowHeaders: [
        "Authorization",
        "Content-Type",
        "Idempotency-Key",
        "X-API-Key",
        "X-Clerk-User-Id",
        "X-Idempotency-Key",
        "X-Request-Id",
        "X-Store-Slug",
        "X-Store-Id",
        "X-User-Email",
        "X-User-Name",
      ],
      allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
      exposeHeaders: ["X-Request-Id"],
      maxAge: 600,
    }),
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: (context) => context.json({ message: "Payload too large" }, 413),
    }),
  );
}
