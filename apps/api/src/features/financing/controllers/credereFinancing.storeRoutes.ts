import type { Hono } from "hono";
import {
  createStoreFinancingContext,
  type FinancingContextFactory,
} from "./credereFinancing.controller.context.js";
import {
  isAsyncSimulationResult,
  parseJson,
  parseParams,
  readRequiredIdempotencyKey,
} from "./credereFinancing.controller.http.js";
import { handleCredereFinancing } from "./credereFinancing.errors.js";
import {
  createSimulationSchema,
  inquiryParamsSchema,
  requiredFieldsSchema,
} from "./credereFinancing.schemas.js";
import type { CredereFinancingServices } from "./credereFinancingServices.js";
import {
  presentSimulation,
  presentSimulationList,
  presentStoreStatus,
} from "./credereFinancing.presenters.js";

export function registerStoreCredereFinancingRoutes(
  feature: Hono,
  input: {
    contextFactory: FinancingContextFactory;
    services: CredereFinancingServices;
  },
) {
  feature.get("/credere/status", (context) =>
    handleCredereFinancing(context, async () => {
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        presentStoreStatus(
          await input.services.store.getStatus(serviceContext),
        ),
      );
    }),
  );

  feature.post("/credere/required-fields", (context) =>
    handleCredereFinancing(context, async () => {
      const body = await parseJson(context, requiredFieldsSchema);
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        await input.services.store.getRequiredFields(serviceContext, {
          document: body.document,
        }),
      );
    }),
  );

  feature.post("/credere/simulations", (context) =>
    handleCredereFinancing(context, async () => {
      const idempotencyKey = readRequiredIdempotencyKey(context);
      const payload = await parseJson(context, createSimulationSchema);
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      const result = await input.services.store.createSimulation(
        serviceContext,
        {
          idempotencyKey,
          payload,
        },
      );
      return context.json(
        presentSimulation(result),
        isAsyncSimulationResult(result) ? 202 : 201,
      );
    }),
  );

  feature.get("/credere/simulations", (context) =>
    handleCredereFinancing(context, async () => {
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        presentSimulationList(
          await input.services.store.listSimulations(serviceContext),
        ),
      );
    }),
  );

  feature.get("/credere/simulations/:inquiryId", (context) =>
    handleCredereFinancing(context, async () => {
      const { inquiryId } = parseParams(context, inquiryParamsSchema);
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        presentSimulation(
          await input.services.store.getSimulation(serviceContext, {
            inquiryId,
          }),
        ),
      );
    }),
  );

  feature.post("/credere/simulations/:inquiryId/refresh", (context) =>
    handleCredereFinancing(context, async () => {
      const { inquiryId } = parseParams(context, inquiryParamsSchema);
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        presentSimulation(
          await input.services.store.refreshSimulation(serviceContext, {
            inquiryId,
          }),
        ),
        202,
      );
    }),
  );
}
