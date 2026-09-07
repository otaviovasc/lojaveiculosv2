import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  CRM_SPECIAL_DATE_TYPES,
  type CrmSpecialDateType,
} from "../../../domains/crm/messaging/crmSpecialDateCalculator.js";
import {
  handleCrmMessaging,
  CrmMessagingValidationError,
} from "./crm.messaging.errors.js";
import { parseCrmMessagingJson } from "./crm.messaging.controller.support.js";
import type { CrmSpecialDateServices } from "./crmSpecialDateServiceBindings.js";
import {
  crmSpecialDateConnectionIdSchema,
  crmUpdateSpecialDateConfigSchema,
} from "./crm.specialDates.schemas.js";

type RegisterCrmSpecialDateRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: Pick<
    CrmSpecialDateServices,
    "getSpecialDateConfigs" | "updateSpecialDateConfig"
  >;
};

export function registerCrmSpecialDateRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmSpecialDateRoutesOptions,
) {
  crmFeature.get(
    "/channel-connections/:connectionId/special-dates",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(context);
        const serviceContext = await createContext(context);
        const configs = await services.getSpecialDateConfigs(serviceContext, {
          connectionId,
        });
        return context.json({ configs });
      }),
  );

  crmFeature.put(
    "/channel-connections/:connectionId/special-dates/:dateType",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(context);
        const dateType = readDateType(context);
        const input = await parseCrmMessagingJson(
          context,
          crmUpdateSpecialDateConfigSchema,
        );
        const serviceContext = await createContext(context);
        const config = await services.updateSpecialDateConfig(serviceContext, {
          ...input,
          connectionId,
          dateType,
        });
        return context.json({ config });
      }),
  );
}

function readConnectionId(context: Context): string {
  const connectionId = context.req.param("connectionId")?.trim();
  if (
    !connectionId ||
    !crmSpecialDateConnectionIdSchema.safeParse(connectionId).success
  ) {
    throw new CrmMessagingValidationError(
      "Route param connectionId is invalid.",
    );
  }
  return connectionId;
}

function readDateType(context: Context): CrmSpecialDateType {
  const dateType = context.req.param("dateType")?.trim();
  if (
    !dateType ||
    !CRM_SPECIAL_DATE_TYPES.some((supportedType) => supportedType === dateType)
  ) {
    throw new CrmMessagingValidationError("Route param dateType is invalid.");
  }
  return dateType as CrmSpecialDateType;
}
