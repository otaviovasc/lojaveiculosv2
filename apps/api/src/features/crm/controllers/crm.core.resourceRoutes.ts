import {
  createCrmCore,
  listCrmCore,
  recordConsentReceipt,
  updateCrmCore,
} from "../../../domains/crm/core/CrmCoreService/index.js";
import { projectCrmCore } from "../../../domains/crm/core/CrmCoreService/coreProjection.js";
import {
  consentCreateSchema,
  contactCreateSchema,
  contactPatchSchema,
  factProposalCreateSchema,
  opportunityCreateSchema,
  opportunityPatchSchema,
} from "./crm.core.schemas.js";
import { parseCoreJson, parseCorePagination } from "./crm.core.support.js";
import type {
  CrmCoreRouteDependencies,
  CrmCoreRouter,
} from "./crm.core.types.js";

export function registerCrmCoreResourceRoutes(
  router: CrmCoreRouter,
  dependencies: CrmCoreRouteDependencies,
): void {
  router.get("/contacts", (context) =>
    dependencies.handleCrm(context, async () => {
      const serviceContext = await dependencies.createContext(context);
      const page = await listCrmCore(
        serviceContext,
        "contacts",
        dependencies.repository,
        parseCorePagination(context),
      );
      return context.json({
        contacts: page.items.map((item) =>
          projectCrmCore(serviceContext, "contacts", item),
        ),
        nextCursor: page.nextCursor,
        requestId: serviceContext.requestId,
      });
    }),
  );
  router.post("/contacts", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, contactCreateSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await createCrmCore(
        serviceContext,
        "contacts",
        input,
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "contacts", item),
        201,
      );
    }),
  );
  router.patch("/contacts/:id", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, contactPatchSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await updateCrmCore(
        serviceContext,
        {
          expectedRevision: input.expectedRevision,
          id: context.req.param("id"),
          patch: input.patch,
          resource: "contacts",
        },
        dependencies.repository,
      );
      return context.json(projectCrmCore(serviceContext, "contacts", item));
    }),
  );

  router.get("/opportunities", (context) =>
    dependencies.handleCrm(context, async () => {
      const serviceContext = await dependencies.createContext(context);
      const page = await listCrmCore(
        serviceContext,
        "opportunities",
        dependencies.repository,
        parseCorePagination(context),
      );
      return context.json({
        opportunities: page.items.map((item) =>
          projectCrmCore(serviceContext, "opportunities", item),
        ),
        nextCursor: page.nextCursor,
        requestId: serviceContext.requestId,
      });
    }),
  );
  router.post("/opportunities", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, opportunityCreateSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await createCrmCore(
        serviceContext,
        "opportunities",
        input,
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "opportunities", item),
        201,
      );
    }),
  );
  router.patch("/opportunities/:id", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, opportunityPatchSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await updateCrmCore(
        serviceContext,
        {
          expectedRevision: input.expectedRevision,
          id: context.req.param("id"),
          patch: {
            ...(input.patch.interests !== undefined
              ? { interests: input.patch.interests }
              : {}),
            ...(input.patch.pipelineId !== undefined
              ? { pipelineId: input.patch.pipelineId }
              : {}),
            ...(input.patch.pipelineStageId !== undefined
              ? { pipelineStageId: input.patch.pipelineStageId }
              : {}),
            ...(input.patch.status !== undefined
              ? { status: input.patch.status }
              : {}),
          },
          resource: "opportunities",
        },
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "opportunities", item),
      );
    }),
  );

  registerSimpleResources(router, dependencies);
}

function registerSimpleResources(
  router: CrmCoreRouter,
  dependencies: CrmCoreRouteDependencies,
): void {
  router.get("/connections", (context) =>
    dependencies.handleCrm(context, async () => {
      const serviceContext = await dependencies.createContext(context);
      const page = await listCrmCore(
        serviceContext,
        "connections",
        dependencies.repository,
        parseCorePagination(context),
      );
      return context.json({
        connections: page.items.map((item) =>
          projectCrmCore(serviceContext, "connections", item),
        ),
        nextCursor: page.nextCursor,
        requestId: serviceContext.requestId,
      });
    }),
  );
  router.get("/consents", (context) =>
    dependencies.handleCrm(context, async () => {
      const serviceContext = await dependencies.createContext(context);
      const page = await listCrmCore(
        serviceContext,
        "consents",
        dependencies.repository,
        parseCorePagination(context),
      );
      return context.json({
        consents: page.items.map((item) =>
          projectCrmCore(serviceContext, "consents", item),
        ),
        nextCursor: page.nextCursor,
        requestId: serviceContext.requestId,
      });
    }),
  );
  router.post("/consents", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, consentCreateSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await recordConsentReceipt(
        serviceContext,
        input,
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "consents", item),
        201,
      );
    }),
  );
  router.get("/fact-proposals", (context) =>
    dependencies.handleCrm(context, async () => {
      const serviceContext = await dependencies.createContext(context);
      const page = await listCrmCore(
        serviceContext,
        "fact-proposals",
        dependencies.repository,
        parseCorePagination(context),
      );
      return context.json({
        factProposals: page.items.map((item) =>
          projectCrmCore(serviceContext, "fact-proposals", item),
        ),
        nextCursor: page.nextCursor,
        requestId: serviceContext.requestId,
      });
    }),
  );
  router.post("/fact-proposals", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, factProposalCreateSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await createCrmCore(
        serviceContext,
        "fact-proposals",
        input,
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "fact-proposals", item),
        201,
      );
    }),
  );
}
