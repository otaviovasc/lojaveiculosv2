import { z } from "zod";

const oneSignalSubscriptionIdSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

export const crmPushSubscriptionBodySchema = z
  .object({ subscriptionId: oneSignalSubscriptionIdSchema })
  .strict();

export const crmPushSubscriptionParamSchema = z.object({
  subscriptionId: oneSignalSubscriptionIdSchema,
});

export const crmPushPreferenceBodySchema = z
  .object({ enabled: z.boolean() })
  .strict();
