import { Hono, type Context } from "hono";
import { createHttpServiceContext } from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  automationServices,
  type AutomationServices,
} from "./automationServices.js";
import {
  automationRunListResponse,
  automationRunResponse,
} from "./automationResponseDtos.js";
import { automationErrorResponse } from "./automationErrorResponses.js";
import {
  automationRunParamsSchema,
  automationStepParamsSchema,
  cancelAutomationRunSchema,
  createAutomationPreviewSchema,
  decideAutomationStepSchema,
  listAutomationRunsSchema,
} from "./automation.controller.schemas.js";
import {
  createProtectedAutomationContext,
  parseAutomationJson,
  parseAutomationValue,
  type AutomationContextFactory,
} from "./automation.controller.support.js";

export type CreateAutomationFeatureOptions = {
  contextFactory?: AutomationContextFactory;
  services?: AutomationServices;
};

export function createAutomationFeature(
  options: CreateAutomationFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? automationServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/runs", async (context) =>
    handleAutomation(context, async () => {
      const serviceContext = await createProtectedAutomationContext(
        context,
        contextFactory,
      );
      const input = parseAutomationValue(
        context.req.query(),
        listAutomationRunsSchema,
      );
      return context.json(
        automationRunListResponse(
          await services.listRuns(serviceContext, input),
        ),
      );
    }),
  );

  feature.post("/runs", async (context) =>
    handleAutomation(context, async () => {
      const serviceContext = await createProtectedAutomationContext(
        context,
        contextFactory,
      );
      const input = await parseAutomationJson(
        context,
        createAutomationPreviewSchema,
      );
      const run = await services.createPreview(serviceContext, input);
      return context.json(automationRunResponse(run), 201);
    }),
  );

  feature.get("/runs/:runId", async (context) =>
    handleAutomation(context, async () => {
      const serviceContext = await createProtectedAutomationContext(
        context,
        contextFactory,
      );
      const input = parseAutomationValue(
        context.req.param(),
        automationRunParamsSchema,
      );
      return context.json(
        automationRunResponse(await services.getRun(serviceContext, input)),
      );
    }),
  );

  feature.post("/runs/:runId/cancel", async (context) =>
    handleAutomation(context, async () => {
      const serviceContext = await createProtectedAutomationContext(
        context,
        contextFactory,
      );
      const params = parseAutomationValue(
        context.req.param(),
        automationRunParamsSchema,
      );
      const body = await parseAutomationJson(
        context,
        cancelAutomationRunSchema,
      );
      return context.json(
        automationRunResponse(
          await services.cancelRun(serviceContext, { ...params, ...body }),
        ),
      );
    }),
  );

  registerDecisionRoute(feature, "approve", contextFactory, services);
  registerDecisionRoute(feature, "reject", contextFactory, services);
  return feature;
}

function registerDecisionRoute(
  feature: Hono,
  decision: "approve" | "reject",
  contextFactory: AutomationContextFactory,
  services: AutomationServices,
) {
  feature.post(`/runs/:runId/steps/:stepId/${decision}`, async (context) =>
    handleAutomation(context, async () => {
      const serviceContext = await createProtectedAutomationContext(
        context,
        contextFactory,
      );
      const params = parseAutomationValue(
        context.req.param(),
        automationStepParamsSchema,
      );
      const body = await parseAutomationJson(
        context,
        decideAutomationStepSchema,
      );
      const service =
        decision === "approve" ? services.approveStep : services.rejectStep;
      const run = await service(serviceContext, { ...params, ...body });
      return context.json(automationRunResponse(run));
    }),
  );
}

async function handleAutomation(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    return automationErrorResponse(context, error);
  }
}
