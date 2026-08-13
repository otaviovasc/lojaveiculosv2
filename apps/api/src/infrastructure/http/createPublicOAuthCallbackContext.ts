import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import type { ServiceLogger } from "../../shared/serviceContext.js";
import { createPlaceholderServiceContext } from "./createPlaceholderServiceContext.js";

export function createPublicOAuthCallbackContextFactory(input: {
  audit?: AuditSink;
  logger?: ServiceLogger;
}) {
  return (context: Context) => {
    const serviceContext = createPlaceholderServiceContext(context, {
      ...(input.audit ? { audit: input.audit } : {}),
      ...(input.logger ? { logger: input.logger } : {}),
    });
    return Promise.resolve({
      ...serviceContext,
      permissions: [...serviceContext.permissions, "financing.oauth.callback"],
    });
  };
}
