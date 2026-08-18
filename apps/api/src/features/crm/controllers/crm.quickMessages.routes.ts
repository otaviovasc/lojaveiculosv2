import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  crmCreateQuickMessageSchema,
  crmUpdateQuickMessageSchema,
} from "./crm.controller.schemas.js";
import {
  assertConversationRead,
  assertMessageSend,
  parseCrmMessagingJson,
} from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";

type RegisterCrmQuickMessageRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmQuickMessageRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmQuickMessageRoutesOptions,
) {
  crmFeature.get("/quick-messages", async (context) =>
    handleCrmMessaging(context, async () => {
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      return context.json(await services.listCrmQuickMessages(serviceContext));
    }),
  );

  crmFeature.post("/quick-messages", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmCreateQuickMessageSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.createCrmQuickMessage(
        serviceContext,
        cleanCreateQuickMessageInput(input),
      );
      return context.json(message, 201);
    }),
  );

  crmFeature.patch("/quick-messages/:quickMessageId", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmUpdateQuickMessageSchema,
      );
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.updateCrmQuickMessage(serviceContext, {
        ...cleanUpdateQuickMessageInput(input),
        quickMessageId: readQuickMessageId(context),
      });
      return context.json(message);
    }),
  );

  crmFeature.delete("/quick-messages/:quickMessageId", async (context) =>
    handleCrmMessaging(context, async () => {
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const message = await services.deleteCrmQuickMessage(serviceContext, {
        quickMessageId: readQuickMessageId(context),
      });
      return context.json(message);
    }),
  );

  crmFeature.post(
    "/conversation-cycles/:cycleId/messages/quick/:quickMessageId",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await createContext(context);
        assertMessageSend(serviceContext);
        const message = await services.sendCrmQuickMessage(serviceContext, {
          ...(context.req.header("Idempotency-Key")
            ? { idempotencyKey: context.req.header("Idempotency-Key")! }
            : {}),
          quickMessageId: readQuickMessageId(context),
          cycleId: context.req.param("cycleId"),
        });
        return context.json(message, 201);
      }),
  );
}

function readQuickMessageId(context: Context) {
  const quickMessageId = context.req.param("quickMessageId");
  if (!quickMessageId) {
    throw new CrmMessagingValidationError(
      "Route param quickMessageId is invalid.",
    );
  }
  return quickMessageId;
}

function cleanCreateQuickMessageInput(input: {
  content?: string | undefined;
  kind: "AUDIO" | "IMAGE" | "TEXT";
  mediaBase64?: string | undefined;
  mediaFileName?: string | undefined;
  mediaType?: string | undefined;
  shortcut: string;
  title: string;
}) {
  return {
    ...(input.content !== undefined ? { content: input.content } : {}),
    kind: input.kind,
    ...(input.mediaBase64 !== undefined
      ? { mediaBase64: input.mediaBase64 }
      : {}),
    ...(input.mediaFileName !== undefined
      ? { mediaFileName: input.mediaFileName }
      : {}),
    ...(input.mediaType !== undefined ? { mediaType: input.mediaType } : {}),
    shortcut: input.shortcut,
    title: input.title,
  };
}

function cleanUpdateQuickMessageInput(input: {
  content?: string | undefined;
  kind?: "AUDIO" | "IMAGE" | "TEXT" | undefined;
  mediaBase64?: string | undefined;
  mediaFileName?: string | undefined;
  mediaType?: string | undefined;
  shortcut?: string | undefined;
  title?: string | undefined;
}) {
  return {
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
    ...(input.mediaBase64 !== undefined
      ? { mediaBase64: input.mediaBase64 }
      : {}),
    ...(input.mediaFileName !== undefined
      ? { mediaFileName: input.mediaFileName }
      : {}),
    ...(input.mediaType !== undefined ? { mediaType: input.mediaType } : {}),
    ...(input.shortcut !== undefined ? { shortcut: input.shortcut } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
  };
}
