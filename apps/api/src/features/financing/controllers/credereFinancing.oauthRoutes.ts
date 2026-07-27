import type { Hono } from "hono";
import {
  CredereFinancingRequestValidationError,
  handleCredereFinancing,
} from "./credereFinancing.errors.js";
import { oauthCallbackQuerySchema } from "./credereFinancing.schemas.js";
import type { CredereFinancingServices } from "./credereFinancingServices.js";
import { readFinancingOAuthReturnTarget } from "../../../domains/financing/support/oauthStateSupport.js";

const agencyRedirectPath = "/agency/admin/credere";
const storeRedirectPath = "/simulations";

export function registerPublicCredereOauthRoutes(
  feature: Hono,
  input: { services: CredereFinancingServices },
) {
  feature.get("/credere/oauth/callback", (context) =>
    handleCredereFinancing(context, async () => {
      const rawQuery = context.req.query();
      const parsed = oauthCallbackQuerySchema.safeParse({
        code: rawQuery.code,
        state: rawQuery.state,
      });
      if (!parsed.success) {
        throw new CredereFinancingRequestValidationError(
          "Request query is invalid.",
        );
      }
      const query = parsed.data;
      await input.services.oauth.completeCallback({
        code: query.code,
        state: query.state,
      });
      if (shouldReturnJsonForCallback()) {
        return context.json({ ok: true, provider: "credere" });
      }
      return context.redirect(resolveRedirectUrl(query.state), 302);
    }),
  );
}

function shouldReturnJsonForCallback() {
  return process.env.NODE_ENV === "test" || process.env.APP_ENV === "test";
}

function resolveRedirectUrl(state: string) {
  const returnPath =
    readFinancingOAuthReturnTarget(state) === "store"
      ? storeRedirectPath
      : agencyRedirectPath;
  const publicAppUrl = process.env.PUBLIC_APP_URL?.trim();
  if (!publicAppUrl) return returnPath;
  const url = new URL(returnPath, publicAppUrl);
  url.searchParams.set("credere", "connected");
  return url.toString();
}
