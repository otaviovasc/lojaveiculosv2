import { Hono, type Context } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  apiErrorInput,
  handleControllerAction,
} from "../../../infrastructure/http/commonApiErrorResponse.js";
import { ComplianceScopeError } from "../../../domains/compliance/services/ComplianceService/serviceSupport.js";
import {
  complianceServices,
  type ComplianceServices,
} from "./complianceServices.js";

export type ComplianceContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateComplianceFeatureOptions = {
  contextFactory?: ComplianceContextFactory;
  services?: ComplianceServices;
};

export function createComplianceFeature(
  options: CreateComplianceFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? complianceServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/snapshot", async (context) =>
    handleCompliance(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.getSnapshot(serviceContext));
    }),
  );

  return feature;
}

async function createUserContext(
  context: Context,
  contextFactory: ComplianceContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Compliance routes require user context.",
    );
  }
  return serviceContext;
}

async function handleCompliance(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  return handleControllerAction(context, action, (error) =>
    error instanceof ComplianceScopeError
      ? apiErrorInput(error, "COMPLIANCE_SCOPE_ERROR", 400)
      : null,
  );
}
