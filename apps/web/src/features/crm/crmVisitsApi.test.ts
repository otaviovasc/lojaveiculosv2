import { describe, expect, it } from "vitest";
import { createCrmVisitsApi } from "./crmVisitsApi";

type FetchCall = {
  init: RequestInit | undefined;
  input: RequestInfo | URL;
};

function createFakeFetch(payloads: unknown[]) {
  const calls: FetchCall[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ init, input });
    return new Response(JSON.stringify(payloads.shift() ?? {}), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };
  return { calls, fetch: fakeFetch };
}

describe("CRM visits API", () => {
  it("lists and creates visits through V2 routes", async () => {
    const fake = createFakeFetch([
      { visits: [{ id: "visit_1" }] },
      { id: "visit_2" },
    ]);
    const api = createCrmVisitsApi({ fetch: fake.fetch });

    await expect(
      api.listVisits({ leadId: "lead_1", limit: 25, status: "scheduled" }),
    ).resolves.toEqual([{ id: "visit_1" }]);
    await expect(
      api.createVisit({
        leadId: "lead_1",
        listingId: null,
        scheduledAt: "2026-07-07T14:00:00.000Z",
        sessionId: "session_1",
      }),
    ).resolves.toEqual({ id: "visit_2" });

    expect(fake.calls[0]?.input).toBe(
      "/api/v1/crm/visits?leadId=lead_1&limit=25&status=scheduled",
    );
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/visits",
      init: {
        body: JSON.stringify({
          leadId: "lead_1",
          listingId: null,
          scheduledAt: "2026-07-07T14:00:00.000Z",
          sessionId: "session_1",
        }),
        method: "POST",
      },
    });
  });

  it("updates visit status through dedicated operation routes", async () => {
    const fake = createFakeFetch([
      { id: "visit_1", status: "confirmed" },
      { id: "visit_1", status: "cancelled" },
      { id: "visit_1", status: "completed" },
    ]);
    const api = createCrmVisitsApi({ fetch: fake.fetch });

    await api.updateVisit("visit_1", { status: "confirmed" });
    await api.cancelVisit("visit_1");
    await api.completeVisit("visit_1");

    expect(fake.calls.map((call) => call.input)).toEqual([
      "/api/v1/crm/visits/visit_1",
      "/api/v1/crm/visits/visit_1/cancel",
      "/api/v1/crm/visits/visit_1/complete",
    ]);
  });
});
