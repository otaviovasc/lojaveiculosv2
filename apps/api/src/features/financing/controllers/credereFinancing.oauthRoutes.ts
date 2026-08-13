import type { Hono } from "hono";
import {
  CredereFinancingRequestValidationError,
  handleCredereFinancing,
} from "./credereFinancing.errors.js";
import { oauthCallbackQuerySchema } from "./credereFinancing.schemas.js";
import type { CredereFinancingServices } from "./credereFinancingServices.js";
import { readFinancingOAuthReturnTarget } from "../../../domains/financing/support/oauthStateSupport.js";
import type { FinancingContextFactory } from "./credereFinancing.controller.context.js";

const agencyRedirectPath = "/agency/admin/credere";
const storeRedirectPath = "/simulations";

export function registerPublicCredereOauthRoutes(
  feature: Hono,
  input: {
    contextFactory: FinancingContextFactory;
    services: CredereFinancingServices;
  },
) {
  feature.get("/credere/oauth/callback", (context) => {
    context.header("Cache-Control", "no-store");
    context.header("Referrer-Policy", "no-referrer");
    return handleCredereFinancing(context, async () => {
      const serviceContext = await input.contextFactory(context);
      const rawQuery = context.req.query();
      const parsed = oauthCallbackQuerySchema.safeParse({
        ...(rawQuery.code ? { code: rawQuery.code } : {}),
        ...(rawQuery.error ? { error: rawQuery.error } : {}),
        ...(rawQuery.state ? { state: rawQuery.state } : {}),
      });
      if (!parsed.success) {
        throw new CredereFinancingRequestValidationError(
          "Request query is invalid.",
        );
      }
      const query = parsed.data;
      const result = await input.services.oauth.completeCallback(
        serviceContext,
        query,
      );
      if (shouldReturnJsonForCallback()) {
        return context.json({
          ok: !("error" in query),
          provider: "credere",
          status: "error" in query ? "cancelled" : "connected",
        });
      }
      return context.redirect(
        resolveRedirectUrl(
          query.state,
          isCancelledResult(result) ? "cancelled" : "connected",
        ),
        302,
      );
    });
  });
}

function shouldReturnJsonForCallback() {
  return process.env.NODE_ENV === "test" || process.env.APP_ENV === "test";
}

function resolveRedirectUrl(state: string, status: "cancelled" | "connected") {
  const returnPath =
    readFinancingOAuthReturnTarget(state) === "store"
      ? storeRedirectPath
      : agencyRedirectPath;
  const publicAppUrl = process.env.PUBLIC_APP_URL?.trim();
  if (!publicAppUrl) return returnPath;
  const url = new URL(returnPath, publicAppUrl);
  url.searchParams.set("credere", status);
  return url.toString();
}

function isCancelledResult(result: unknown) {
  return (
    Boolean(result) &&
    typeof result === "object" &&
    (result as { kind?: unknown }).kind === "cancelled"
  );
}
