import { describe, expect, it } from "vitest";
import { applyWonCrmLeadOutcome } from "./applyWonCrmLeadOutcome.js";
import { createWonLeadOutcomeFixture as createFixture } from "./applyWonCrmLeadOutcome.testSupport.js";

describe("applyWonCrmLeadOutcome origin", () => {
  it("persists null channel when no explicit origin is supplied", async () => {
    const fixture = createFixture();

    const result = await applyWonCrmLeadOutcome(
      fixture.context,
      {
        commandId: "command-without-origin",
        leadId: fixture.lead.id,
        originSessionId: null,
        saleId: "sale-1",
      },
      fixture.ports,
    );

    expect(result.outcome).toMatchObject({
      channel: null,
      originSessionId: null,
    });
  });
  it("preserves the channel from the explicit origin", async () => {
    const fixture = createFixture();

    const result = await applyWonCrmLeadOutcome(
      fixture.context,
      {
        commandId: "command-with-origin",
        leadId: fixture.lead.id,
        originSessionId: fixture.cycle.id,
        saleId: "sale-1",
      },
      fixture.ports,
    );

    expect(result.outcome).toMatchObject({
      channel: "WHATSAPP",
      originSessionId: fixture.cycle.id,
    });
  });
});
