import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappCreateQuickMessageSchema,
  whatsappSendQuickMessageSchema,
  whatsappUpdateQuickMessageSchema,
} from "./crm.controller.schemas.js";
import {
  assertWhatsappRead,
  assertWhatsappSend,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";

type RegisterCrmWhatsappQuickMessageRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappQuickMessageRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappQuickMessageRoutesOptions,
) {
  crmFeature.get("/whatsapp/quick-messages", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      assertWhatsappRead(serviceContext);
      return context.json(
        await services.listWhatsappQuickMessages(serviceContext),
      );
    }),
  );

  crmFeature.post("/whatsapp/quick-messages", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappCreateQuickMessageSchema,
      );
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const message = await services.createWhatsappQuickMessage(
        serviceContext,
        cleanCreateQuickMessageInput(input),
      );
      return context.json(message, 201);
    }),
  );

  crmFeature.patch(
    "/whatsapp/quick-messages/:quickMessageId",
    async (context) =>
      handleWhatsapp(context, async () => {
        const input = await parseWhatsappJson(
          context,
          whatsappUpdateQuickMessageSchema,
        );
        const serviceContext = await createContext(context);
        assertWhatsappSend(serviceContext);
        const message = await services.updateWhatsappQuickMessage(
          serviceContext,
          {
            ...cleanUpdateQuickMessageInput(input),
            quickMessageId: readQuickMessageId(context),
          },
        );
        return context.json(message);
      }),
  );

  crmFeature.delete(
    "/whatsapp/quick-messages/:quickMessageId",
    async (context) =>
      handleWhatsapp(context, async () => {
        const serviceContext = await createContext(context);
        assertWhatsappSend(serviceContext);
        const message = await services.deleteWhatsappQuickMessage(
          serviceContext,
          { quickMessageId: readQuickMessageId(context) },
        );
        return context.json(message);
      }),
  );

  crmFeature.post(
    "/whatsapp/quick-messages/:quickMessageId/send",
    async (context) =>
      handleWhatsapp(context, async () => {
        const input = await parseWhatsappJson(
          context,
          whatsappSendQuickMessageSchema,
        );
        const serviceContext = await createContext(context);
        assertWhatsappSend(serviceContext);
        const message = await services.sendWhatsappQuickMessage(
          serviceContext,
          {
            quickMessageId: readQuickMessageId(context),
            sessionId: input.sessionId,
          },
        );
        return context.json(message, 201);
      }),
  );
}

function readQuickMessageId(context: Context) {
  const quickMessageId = context.req.param("quickMessageId");
  if (!quickMessageId) {
    throw new CrmWhatsappValidationError(
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
