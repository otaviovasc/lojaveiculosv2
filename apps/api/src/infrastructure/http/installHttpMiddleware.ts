import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

export function installHttpMiddleware(app: Hono): void {
  app.use(
    "*",
    secureHeaders(),
    cors({
      allowHeaders: [
        "Authorization",
        "Content-Type",
        "X-API-Key",
        "X-Idempotency-Key",
        "X-Request-Id",
        "X-Store-Id",
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
