import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { MAX_CAMPAIGN_MEDIA_BASE64_LENGTH } from "../../domains/crm/messaging/crmCampaignMediaIngestion.js";
import { jsonApiError } from "./apiErrorResponse.js";
import { ensureHttpRequestId } from "./requestMetadata.js";

const DEFAULT_HTTP_BODY_LIMIT = 1024 * 1024;
// A 10 MiB image expands to roughly 13.98 MiB in base64. Leave room for the
// JSON envelope and data URI prefix only on the campaign-create route.
export const CRM_CAMPAIGN_CREATE_BODY_LIMIT =
  MAX_CAMPAIGN_MEDIA_BASE64_LENGTH + 256 * 1024;

export function installHttpMiddleware(app: Hono): void {
  const rejectOversizedPayload = (context: Context) =>
    jsonApiError(context, {
      code: "PAYLOAD_TOO_LARGE",
      message: "Payload too large.",
      status: 413,
    });
  const defaultBodyLimit = bodyLimit({
    maxSize: DEFAULT_HTTP_BODY_LIMIT,
    onError: rejectOversizedPayload,
  });
  const campaignBodyLimit = bodyLimit({
    maxSize: CRM_CAMPAIGN_CREATE_BODY_LIMIT,
    onError: rejectOversizedPayload,
  });
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
        "X-CRM-SSE-Ticket",
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
    async (context, next) => {
      const path = context.req.path.replace(/\/+$/, "");
      const isCampaignCreate =
        context.req.method === "POST" && path === "/api/v1/crm/campaigns";
      return (isCampaignCreate ? campaignBodyLimit : defaultBodyLimit)(
        context,
        next,
      );
    },
  );
}
