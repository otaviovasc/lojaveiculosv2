import type { Hono } from "hono";
import {
  createDirectOwnerFinancingContext,
  type FinancingContextFactory,
} from "./credereFinancing.controller.context.js";
import { parseJson } from "./credereFinancing.controller.http.js";
import { handleCredereFinancing } from "./credereFinancing.errors.js";
import { upsertStoreMappingSchema } from "./credereFinancing.schemas.js";
import type { CredereFinancingServices } from "./credereFinancingServices.js";
import {
  presentDirectOwnerConnection,
  presentProviderStores,
  presentStoreMapping,
} from "./credereFinancing.presenters.js";

export function registerDirectOwnerCredereFinancingRoutes(
  feature: Hono,
  input: {
    contextFactory: FinancingContextFactory;
    services: CredereFinancingServices;
  },
) {
  feature.get("/credere/connection", (context) =>
    handleCredereFinancing(context, async () => {
      const serviceContext = await createDirectOwnerFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        presentDirectOwnerConnection(
          await input.services.agency.getConnection(serviceContext),
          serviceContext.storeId,
        ),
      );
    }),
  );

  feature.post("/credere/oauth/start", (context) =>
    handleCredereFinancing(context, async () => {
      const serviceContext = await createDirectOwnerFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        await input.services.agency.startOAuth(serviceContext),
        201,
      );
    }),
  );

  feature.get("/credere/provider-stores", (context) =>
    handleCredereFinancing(context, async () => {
      const serviceContext = await createDirectOwnerFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        presentProviderStores(
          await input.services.agency.listProviderStores(serviceContext),
        ),
      );
    }),
  );

  feature.put("/credere/store-mapping", (context) =>
    handleCredereFinancing(context, async () => {
      const body = await parseJson(context, upsertStoreMappingSchema);
      const serviceContext = await createDirectOwnerFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        presentStoreMapping(
          await input.services.agency.upsertStoreMapping(serviceContext, {
            externalStoreId: body.externalStoreId,
            storeId: serviceContext.storeId,
          }),
        ),
      );
    }),
  );

  feature.delete("/credere/store-mapping", (context) =>
    handleCredereFinancing(context, async () => {
      const serviceContext = await createDirectOwnerFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        await input.services.agency.deleteStoreMapping(serviceContext, {
          storeId: serviceContext.storeId,
        }),
      );
    }),
  );

  feature.delete("/credere/connection", (context) =>
    handleCredereFinancing(context, async () => {
      const serviceContext = await createDirectOwnerFinancingContext(
        context,
        input.contextFactory,
      );
      return context.json(
        await input.services.agency.deleteConnection(serviceContext),
      );
    }),
  );
}
