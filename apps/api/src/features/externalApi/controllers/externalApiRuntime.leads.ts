import type { Hono } from "hono";
import type { CrmServices } from "../../crm/controllers/crmServices.js";
import { toExternalLead } from "./externalApiRuntime.dtos.js";
import {
  externalCreateLeadSchema,
  externalLeadQuerySchema,
  externalUpdateLeadSchema,
} from "./externalApiRuntime.schemas.js";
import {
  createIntegrationContext,
  handleRuntime,
  parseJson,
  parseQuery,
  type RuntimeContextFactory,
} from "./externalApiRuntime.http.js";
import {
  assertLeadHasBuyerSignal,
  cleanCreateLeadInput,
  cleanUpdateLeadInput,
  createPagination,
} from "./externalApiRuntime.support.js";

export function registerExternalLeadRoutes(
  feature: Hono,
  input: {
    contextFactory: RuntimeContextFactory;
    crm: CrmServices;
  },
) {
  feature.get("/leads", (context) =>
    handleRuntime(context, async () => {
      const query = parseQuery(context, externalLeadQuerySchema);
      const serviceContext = await createIntegrationContext(
        context,
        input.contextFactory,
      );
      const limit = query.limit;
      const offset = query.offset ?? (query.page - 1) * limit;
      const leadSearch = query.search ?? query.q ?? query.phone;
      const leads = await input.crm.listLeads(serviceContext, {
        limit,
        offset,
        ...(query.listingId ? { listingId: query.listingId } : {}),
        ...(leadSearch ? { search: leadSearch } : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(query.status ? { status: query.status } : {}),
      });
      return context.json({
        data: leads.map(toExternalLead),
        pagination: createPagination(query.page, limit, offset, leads.length),
      });
    }),
  );
  feature.post("/leads", (context) =>
    handleRuntime(context, async () => {
      const inputBody = await parseJson(context, externalCreateLeadSchema);
      assertLeadHasBuyerSignal(inputBody);
      const serviceContext = await createIntegrationContext(
        context,
        input.contextFactory,
      );
      const lead = await input.crm.createLead(
        serviceContext,
        cleanCreateLeadInput(inputBody),
      );
      return context.json({ data: toExternalLead(lead) }, 201);
    }),
  );
  feature.get("/leads/:leadId", (context) =>
    handleRuntime(context, async () => {
      const serviceContext = await createIntegrationContext(
        context,
        input.contextFactory,
      );
      const lead = await input.crm.getLead(serviceContext, {
        leadId: context.req.param("leadId"),
      });
      return context.json({ data: toExternalLead(lead) });
    }),
  );
  feature.patch("/leads/:leadId", (context) =>
    handleRuntime(context, async () => {
      const inputBody = await parseJson(context, externalUpdateLeadSchema);
      const serviceContext = await createIntegrationContext(
        context,
        input.contextFactory,
      );
      const lead = await input.crm.updateLead(serviceContext, {
        ...cleanUpdateLeadInput(inputBody),
        leadId: context.req.param("leadId"),
      });
      return context.json({ data: toExternalLead(lead) });
    }),
  );
}
