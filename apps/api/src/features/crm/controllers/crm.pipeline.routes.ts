import type { Context, Hono } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServices } from "./crmServices.js";
import {
  cleanCreatePipelineInput,
  cleanUpdatePipelineInput,
} from "./crm.controller.cleaners.js";
import {
  createPipelineSchema,
  moveLeadPipelineStageSchema,
  updatePipelineSchema,
} from "./crm.controller.schemas.js";

type RouteSupport = {
  createContext: (context: Context) => Promise<ServiceContext>;
  handleCrm: (
    context: Context,
    action: () => Promise<Response>,
  ) => Promise<Response>;
  parseJson: <Schema extends z.ZodType>(
    context: Context,
    schema: Schema,
  ) => Promise<z.infer<Schema>>;
  services: CrmServices;
};

export function registerCrmPipelineRoutes(
  crmFeature: Hono,
  support: RouteSupport,
) {
  const { createContext, handleCrm, parseJson, services } = support;

  crmFeature.get("/pipelines", async (context) =>
    handleCrm(context, async () => {
      const serviceContext = await createContext(context);
      const pipelines = await services.listPipelines(serviceContext);
      return context.json({ pipelines });
    }),
  );

  crmFeature.post("/pipelines", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, createPipelineSchema);
      const serviceContext = await createContext(context);
      const pipeline = await services.createPipeline(
        serviceContext,
        cleanCreatePipelineInput(input),
      );
      return context.json(pipeline, 201);
    }),
  );

  crmFeature.patch("/pipelines/:pipelineId", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, updatePipelineSchema);
      const serviceContext = await createContext(context);
      const pipeline = await services.updatePipeline(
        serviceContext,
        cleanUpdatePipelineInput(context.req.param("pipelineId"), input),
      );
      return context.json(pipeline);
    }),
  );

  crmFeature.delete("/pipelines/:pipelineId", async (context) =>
    handleCrm(context, async () => {
      const serviceContext = await createContext(context);
      const result = await services.deletePipeline(serviceContext, {
        pipelineId: context.req.param("pipelineId"),
      });
      return context.json(result);
    }),
  );

  crmFeature.patch("/leads/:leadId/pipeline-stage", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, moveLeadPipelineStageSchema);
      const serviceContext = await createContext(context);
      const lead = await services.moveLeadPipelineStage(serviceContext, {
        leadId: context.req.param("leadId"),
        pipelineStageId: input.pipelineStageId,
      });
      return context.json(lead);
    }),
  );
}
