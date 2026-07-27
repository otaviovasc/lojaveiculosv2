import type { Hono } from "hono";
import {
  createAgencyFinancingContext,
  type AgencyAccountContextFactory,
} from "./credereFinancing.controller.context.js";
import { parseJson, parseParams } from "./credereFinancing.controller.http.js";
import { handleCredereFinancing } from "./credereFinancing.errors.js";
import {
  agencyStoreMappingParamsSchema,
  agencyTenantParamsSchema,
  upsertStoreMappingSchema,
} from "./credereFinancing.schemas.js";
import type { CredereFinancingServices } from "./credereFinancingServices.js";
import {
  presentAgencyConnection,
  presentProviderStores,
  presentStoreMapping,
} from "./credereFinancing.presenters.js";

export function registerAgencyCredereFinancingRoutes(
  feature: Hono,
  input: {
    accountContextFactory: AgencyAccountContextFactory;
    services: CredereFinancingServices;
  },
) {
  feature.get("/tenants/:tenantId/financing/credere", async (context) =>
    handleCredereFinancing(context, async () => {
      const { tenantId } = parseParams(context, agencyTenantParamsSchema);
      const serviceContext = await createAgencyFinancingContext(
        context,
        input.accountContextFactory,
        tenantId,
      );
      return context.json(
        presentAgencyConnection(
          await input.services.agency.getConnection(serviceContext),
        ),
      );
    }),
  );

  feature.post("/tenants/:tenantId/financing/credere/oauth/start", (context) =>
    handleCredereFinancing(context, async () => {
      const { tenantId } = parseParams(context, agencyTenantParamsSchema);
      const serviceContext = await createAgencyFinancingContext(
        context,
        input.accountContextFactory,
        tenantId,
      );
      return context.json(
        await input.services.agency.startOAuth(serviceContext),
        201,
      );
    }),
  );

  feature.get(
    "/tenants/:tenantId/financing/credere/provider-stores",
    (context) =>
      handleCredereFinancing(context, async () => {
        const { tenantId } = parseParams(context, agencyTenantParamsSchema);
        const serviceContext = await createAgencyFinancingContext(
          context,
          input.accountContextFactory,
          tenantId,
        );
        return context.json(
          presentProviderStores(
            await input.services.agency.listProviderStores(serviceContext),
          ),
        );
      }),
  );

  feature.put(
    "/tenants/:tenantId/financing/credere/store-mappings/:storeId",
    (context) =>
      handleCredereFinancing(context, async () => {
        const params = parseParams(context, agencyStoreMappingParamsSchema);
        const body = await parseJson(context, upsertStoreMappingSchema);
        const serviceContext = await createAgencyFinancingContext(
          context,
          input.accountContextFactory,
          params.tenantId,
        );
        return context.json(
          presentStoreMapping(
            await input.services.agency.upsertStoreMapping(serviceContext, {
              externalStoreId: body.externalStoreId,
              storeId: params.storeId,
            }),
          ),
        );
      }),
  );

  feature.delete(
    "/tenants/:tenantId/financing/credere/store-mappings/:storeId",
    (context) =>
      handleCredereFinancing(context, async () => {
        const params = parseParams(context, agencyStoreMappingParamsSchema);
        const serviceContext = await createAgencyFinancingContext(
          context,
          input.accountContextFactory,
          params.tenantId,
        );
        return context.json(
          await input.services.agency.deleteStoreMapping(serviceContext, {
            storeId: params.storeId,
          }),
        );
      }),
  );

  feature.delete("/tenants/:tenantId/financing/credere/connection", (context) =>
    handleCredereFinancing(context, async () => {
      const { tenantId } = parseParams(context, agencyTenantParamsSchema);
      const serviceContext = await createAgencyFinancingContext(
        context,
        input.accountContextFactory,
        tenantId,
      );
      return context.json(
        await input.services.agency.deleteConnection(serviceContext),
      );
    }),
  );
}
