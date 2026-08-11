import { describe, expect, it } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { executeWhatsappBotAction } from "./whatsappBotActions.js";

describe("executeWhatsappBotAction audit lifecycle", () => {
  it("records attempted and failed without a false success on validation errors", async () => {
    const audit = createMemoryAuditSink();

    await expect(
      executeWhatsappBotAction(
        createContext(audit),
        { action: "create_tag", payload: {} },
        createPorts(),
      ),
    ).rejects.toThrow("Payload field name is required.");

    expect(actionOutcomes(audit)).toEqual(["attempted", "failed"]);
  });

  it("records succeeded only after the action completes", async () => {
    const audit = createMemoryAuditSink();

    await expect(
      executeWhatsappBotAction(
        createContext(audit),
        { action: "check_connection" },
        createPorts(),
      ),
    ).resolves.toEqual([]);

    expect(actionOutcomes(audit)).toEqual(["attempted", "succeeded"]);
  });
});

function createContext(audit: ReturnType<typeof createMemoryAuditSink>) {
  return createServiceContext({
    actor: { id: "bot-1", kind: "integration" },
    audit,
    entitlements: ["crm"],
    permissions: ["crm.whatsapp.integrations.manage", "crm.whatsapp.list"],
    request: { requestId: "request-1" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
}

function createPorts(): CrmServicePorts {
  return {
    crmConnectionRepository: createTestCrmConnectionRepository(),
    crmRepository: {} as never,
  };
}

function actionOutcomes(audit: ReturnType<typeof createMemoryAuditSink>) {
  return audit.events
    .filter((event) => event.action === "crm.whatsapp.bot.action.execute")
    .map((event) => event.outcome);
}
