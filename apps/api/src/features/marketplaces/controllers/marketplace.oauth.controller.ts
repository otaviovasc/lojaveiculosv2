import { Hono, type Context } from "hono";
import { createHttpServiceContext } from "../../../infrastructure/http/createHttpServiceContext.js";
import { marketplaceOAuthCallbackQuerySchema } from "./marketplace.controller.schemas.js";
import type { CreateMarketplaceFeatureOptions } from "./marketplace.controller.js";
import {
  marketplaceServices,
  type MarketplaceServices,
} from "./marketplaceServices.js";
import { MarketplaceRequestValidationError } from "./marketplaceErrorResponses.js";

const marketplaceResultPath = "/dashboard";

export function createMarketplaceOAuthCallbackFeature(
  options: CreateMarketplaceFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? marketplaceServices;
  const contextFactory =
    options.callbackContextFactory ??
    options.contextFactory ??
    ((context) => createHttpServiceContext(context));

  feature.get("/callback", async (context) => {
    context.header("Cache-Control", "no-store");
    context.header("Referrer-Policy", "no-referrer");
    try {
      const query = parseOAuthCallbackQuery(context);
      const serviceContext = await contextFactory(context);
      const result = await services.receiveOAuthCallback(serviceContext, {
        ...query,
        provider: "olx",
      });
      return context.redirect(marketplaceResultUrl(result), 302);
    } catch {
      return context.redirect(
        `${marketplaceResultPath}?marketplaceOauth=error&provider=olx#/marketplaces`,
        302,
      );
    }
  });

  return feature;
}

function parseOAuthCallbackQuery(context: Context) {
  const query = context.req.query();
  const result = marketplaceOAuthCallbackQuerySchema.safeParse({
    ...(query.code ? { code: query.code } : {}),
    ...(query.error ? { error: query.error } : {}),
    ...(query.state ? { state: query.state } : {}),
  });
  if (!result.success) {
    throw new MarketplaceRequestValidationError("Request query is invalid.");
  }
  return result.data;
}

function marketplaceResultUrl(
  result: Awaited<ReturnType<MarketplaceServices["receiveOAuthCallback"]>>,
) {
  const params = new URLSearchParams({
    marketplaceOauth: result.kind === "received" ? "pending" : "cancelled",
    provider: result.provider,
  });
  if (result.kind === "received") {
    params.set("transactionId", result.transactionId);
  }
  return `${marketplaceResultPath}?${params.toString()}#/marketplaces`;
}
