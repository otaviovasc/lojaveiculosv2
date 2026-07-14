import type { Context } from "hono";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";

export async function createProtectedFinanceServiceContext(
  context: Context,
  contextFactory: (context: Context) => Promise<ServiceContext>,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (!["integration", "user"].includes(serviceContext.actor.kind)) {
    throw new HttpContextAuthenticationError(
      "Finance routes require authenticated user or integration context.",
    );
  }
  return serviceContext;
}
