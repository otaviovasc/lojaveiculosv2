import type { Hono } from "hono";
import type { CredereFinancingServices } from "../../financing/controllers/credereFinancingServices.js";
import {
  createSimulationSchema,
  inquiryParamsSchema,
  requiredFieldsSchema,
} from "../../financing/controllers/credereFinancing.schemas.js";
import {
  presentSimulation,
  presentStoreStatus,
} from "../../financing/controllers/credereFinancing.presenters.js";
import { CredereFinancingInquiryNotFoundError } from "../../financing/controllers/credereFinancing.errors.js";
import {
  createIntegrationContext,
  handleRuntime,
  parseJson,
  parseParams,
  type RuntimeContextFactory,
} from "./externalApiRuntime.http.js";

export function registerExternalCredereRoutes(
  feature: Hono,
  input: {
    contextFactory: RuntimeContextFactory;
    financing: CredereFinancingServices;
  },
) {
  feature.post("/financing/credere/preflight", (context) =>
    handleRuntime(context, async () => {
      const body = await parseJson(context, requiredFieldsSchema);
      const serviceContext = await createIntegrationContext(
        context,
        input.contextFactory,
      );
      const [status, applicant] = await Promise.all([
        input.financing.store.getStatus(serviceContext),
        input.financing.store.getRequiredFields(serviceContext, {
          ...(body.bankCodes ? { bankCodes: body.bankCodes } : {}),
          document: body.document,
        }),
      ]);
      return context.json({
        data: {
          applicant,
          readiness: presentStoreStatus(status),
        },
      });
    }),
  );

  feature.post("/financing/credere/simulations", (context) =>
    handleRuntime(context, async () => {
      const payload = await parseJson(context, createSimulationSchema);
      const serviceContext = await createIntegrationContext(
        context,
        input.contextFactory,
      );
      const result = await input.financing.store.createSimulation(
        serviceContext,
        {
          idempotencyKey: context.req.header("Idempotency-Key")!,
          payload,
        },
      );
      return context.json({ data: presentSimulation(result) }, 202);
    }),
  );

  feature.get("/financing/credere/simulations/:inquiryId", (context) =>
    handleRuntime(context, async () => {
      const { inquiryId } = parseParams(context, inquiryParamsSchema);
      const serviceContext = await createIntegrationContext(
        context,
        input.contextFactory,
      );
      const result = await input.financing.store.getSimulation(serviceContext, {
        inquiryId,
      });
      if (!result) throw new CredereFinancingInquiryNotFoundError(inquiryId);
      return context.json({ data: presentSimulation(result) });
    }),
  );
}
