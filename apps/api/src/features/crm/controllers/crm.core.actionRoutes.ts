import {
  createContactIdentity,
  disputeContactIdentity,
  listCrmCore,
  mergeContact,
  recordInboundConversation,
  startConversation,
  unmergeContact,
  verifyContactIdentity,
} from "../../../domains/crm/core/CrmCoreService/index.js";
import { projectCrmCore } from "../../../domains/crm/core/CrmCoreService/coreProjection.js";
import {
  contactIdentityCreateSchema,
  expectedRevisionSchema,
  identityDecisionSchema,
  startConversationSchema,
} from "./crm.core.schemas.js";
import { parseCoreJson, parseCorePagination } from "./crm.core.support.js";
import type {
  CrmCoreRouteDependencies,
  CrmCoreRouter,
} from "./crm.core.types.js";

const mergeSchema = expectedRevisionSchema.extend({
  targetContactId: startConversationSchema.shape.contactId,
});

export function registerCrmCoreActionRoutes(
  router: CrmCoreRouter,
  dependencies: CrmCoreRouteDependencies,
): void {
  router.get("/contact-identities", (context) =>
    dependencies.handleCrm(context, async () => {
      const serviceContext = await dependencies.createContext(context);
      const page = await listCrmCore(
        serviceContext,
        "contact-identities",
        dependencies.repository,
        parseCorePagination(context),
      );
      return context.json({
        contactIdentities: page.items.map((item) =>
          projectCrmCore(serviceContext, "contact-identities", item),
        ),
        nextCursor: page.nextCursor,
        requestId: serviceContext.requestId,
      });
    }),
  );
  router.post("/contact-identities", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, contactIdentityCreateSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await createContactIdentity(
        serviceContext,
        {
          ...(input.contactId !== undefined
            ? { contactId: input.contactId }
            : {}),
          kind: input.kind,
          value: input.value,
        },
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "contact-identities", item),
        201,
      );
    }),
  );
  router.post("/contact-identities/:id/dispute", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, identityDecisionSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await disputeContactIdentity(
        serviceContext,
        {
          expectedRevision: input.expectedRevision,
          evidence: input.evidence,
          identityId: context.req.param("id"),
          occurredAt: input.occurredAt,
          source: input.source,
        },
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "contact-identities", item),
      );
    }),
  );
  router.post("/contact-identities/:id/verify", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, identityDecisionSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await verifyContactIdentity(
        serviceContext,
        {
          ...(input.contactId ? { contactId: input.contactId } : {}),
          evidence: input.evidence,
          expectedRevision: input.expectedRevision,
          identityId: context.req.param("id"),
          occurredAt: input.occurredAt,
          source: input.source,
        },
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "contact-identities", item),
      );
    }),
  );
  router.post("/contacts/:id/merge", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, mergeSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await mergeContact(
        serviceContext,
        {
          expectedRevision: input.expectedRevision,
          sourceContactId: context.req.param("id"),
          targetContactId: input.targetContactId,
        },
        dependencies.repository,
      );
      return context.json(projectCrmCore(serviceContext, "contacts", item));
    }),
  );
  router.post("/contacts/:id/unmerge", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, expectedRevisionSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await unmergeContact(
        serviceContext,
        {
          contactId: context.req.param("id"),
          expectedRevision: input.expectedRevision,
        },
        dependencies.repository,
      );
      return context.json(projectCrmCore(serviceContext, "contacts", item));
    }),
  );
  registerConversationRoutes(router, dependencies);
}

function registerConversationRoutes(
  router: CrmCoreRouter,
  dependencies: CrmCoreRouteDependencies,
): void {
  router.get("/conversations", (context) =>
    dependencies.handleCrm(context, async () => {
      const serviceContext = await dependencies.createContext(context);
      const page = await listCrmCore(
        serviceContext,
        "conversations",
        dependencies.repository,
        parseCorePagination(context),
      );
      return context.json({
        conversations: page.items.map((item) =>
          projectCrmCore(serviceContext, "conversations", item),
        ),
        nextCursor: page.nextCursor,
        requestId: serviceContext.requestId,
      });
    }),
  );
  router.post("/conversations", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, startConversationSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await startConversation(
        serviceContext,
        input,
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "conversations", item),
        201,
      );
    }),
  );
  router.post("/conversations/:id/inbound", (context) =>
    dependencies.handleCrm(context, async () => {
      const input = await parseCoreJson(context, expectedRevisionSchema);
      const serviceContext = await dependencies.createContext(context);
      const item = await recordInboundConversation(
        serviceContext,
        {
          conversationId: context.req.param("id"),
          expectedRevision: input.expectedRevision,
        },
        dependencies.repository,
      );
      return context.json(
        projectCrmCore(serviceContext, "conversations", item),
      );
    }),
  );
}
