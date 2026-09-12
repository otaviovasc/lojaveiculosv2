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
import {
  CredereFinancingInquiryNotFoundError,
  handleCredereFinancing,
} from "./credereFinancing.errors.js";
import {
  createSimulationSchema,
  inquiryParamsSchema,
  requiredFieldsSchema,
  resolveFipeVehicleSchema,
} from "./credereFinancing.schemas.js";
import type { CredereFinancingServices } from "./credereFinancingServices.js";
import {
  presentSimulation,
  presentSimulationList,
  presentSimulationSync,
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
          { includeBankHealth: true },
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
          ...(body.bankCodes ? { bankCodes: body.bankCodes } : {}),
          document: body.document,
        }),
      );
    }),
  );

  feature.post("/credere/vehicle-models/resolve-fipe", (context) =>
    handleCredereFinancing(context, async () => {
      const body = await parseJson(context, resolveFipeVehicleSchema);
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        await input.services.store.resolveFipeVehicle(serviceContext, {
          fipeCode: body.fipeCode,
          modelYear: body.modelYear,
          ...(body.selectedModelId
            ? { selectedModelId: body.selectedModelId }
            : {}),
          ...(body.selectedMolicarCode
            ? { selectedMolicarCode: body.selectedMolicarCode }
            : {}),
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

  feature.post("/credere/simulations/sync", (context) =>
    handleCredereFinancing(context, async () => {
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        presentSimulationSync(
          await input.services.store.syncSimulations(serviceContext),
        ),
        202,
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
      const simulation = await input.services.store.getSimulation(
        serviceContext,
        { inquiryId },
      );
      if (!simulation)
        throw new CredereFinancingInquiryNotFoundError(inquiryId);
      return context.json(presentSimulation(simulation));
    }),
  );

  feature.post("/credere/simulations/:inquiryId/refresh", (context) =>
    handleCredereFinancing(context, async () => {
      const { inquiryId } = parseParams(context, inquiryParamsSchema);
      const serviceContext = await createStoreFinancingContext(
        context,
        input.contextFactory,
      );
      const simulation = await input.services.store.refreshSimulation(
        serviceContext,
        { inquiryId },
      );
      if (!simulation)
        throw new CredereFinancingInquiryNotFoundError(inquiryId);
      return context.json(presentSimulation(simulation), 202);
    }),
  );
}
