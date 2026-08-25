import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createMemoryCrmPushRepository } from "../../testSupportCrmPush.js";
import type { CrmServicePorts } from "../CrmService/types.js";
import {
  disableCrmPushSubscription,
  getCrmPushSettings,
  registerCrmPushSubscription,
  setOwnCrmPushPreference,
} from "./pushSettings.js";

const subscriptionId = "11111111-1111-4111-8111-111111111111";

describe("CRM push settings", () => {
  it("registers a browser globally and transfers shared-browser ownership", async () => {
    const repository = createMemoryCrmPushRepository();
    const ports = createPorts(repository);
    const first = await registerCrmPushSubscription(
      context("user_1"),
      { subscriptionId },
      ports,
    );
    const transferred = await registerCrmPushSubscription(
      context("user_2"),
      { subscriptionId },
      ports,
    );

    expect(first).toMatchObject({ created: true, transferredFromUserId: null });
    expect(transferred).toMatchObject({
      created: false,
      transferredFromUserId: "user_1",
    });
    expect(await getCrmPushSettings(context("user_1"), ports)).toMatchObject({
      enabled: false,
      subscription: null,
    });
    expect(await getCrmPushSettings(context("user_2"), ports)).toMatchObject({
      enabled: true,
      subscription: { enabled: true, subscriptionId },
    });
  });

  it("keeps the store preference separate from browser registration", async () => {
    const repository = createMemoryCrmPushRepository();
    const ports = createPorts(repository);
    const actor = context("user_1");
    await registerCrmPushSubscription(actor, { subscriptionId }, ports);
    await setOwnCrmPushPreference(actor, { enabled: false }, ports);

    expect(await getCrmPushSettings(actor, ports)).toMatchObject({
      enabled: false,
      preferenceEnabled: false,
      subscription: { enabled: true, subscriptionId },
    });
    expect(
      await disableCrmPushSubscription(actor, { subscriptionId }, ports),
    ).toEqual({ disabled: true });
  });
});

function context(userId: string) {
  return createServiceContext({
    actor: { id: userId, kind: "user" },
    entitlements: ["crm"],
    permissions: ["crm.conversations.read"],
    request: { requestId: `request_${userId}` },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createPorts(
  crmPushRepository: ReturnType<typeof createMemoryCrmPushRepository>,
): CrmServicePorts {
  return { crmPushRepository, crmRepository: {} as never };
}
