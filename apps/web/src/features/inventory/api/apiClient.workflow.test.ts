import { describe, expect, it } from "vitest";
import { createInventoryApi } from "./apiClient";

type FetchCall = { init: RequestInit | undefined; input: RequestInfo | URL };

function createFakeFetch() {
  const calls: FetchCall[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ init, input });
    return new Response(JSON.stringify({ status: "ready" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };

  return { calls, fetch: fakeFetch };
}

function bodyOf(call: FetchCall) {
  return JSON.parse(String(call.init?.body)) as Record<string, unknown>;
}

describe("createInventoryApi workflow methods", () => {
  it("reserves, sells, and releases units through workflow routes", async () => {
    const fake = createFakeFetch();
    const api = createInventoryApi({ fetch: fake.fetch });

    await api.reserveUnit("unit_1", {
      buyer: { document: "000", name: "Buyer" },
      paymentMethod: "pix",
      salePriceCents: 12000000,
      signalAmountCents: 100000,
    });
    await api.sellUnit("unit_1", {
      buyer: { email: "buyer@example.com", name: "Buyer" },
      paidAmountCents: 12000000,
      paymentMethod: "bank_transfer",
      salePriceCents: 12000000,
    });
    await api.releaseReservation("unit_1", {
      reason: "Cliente desistiu",
      saleId: "sale_1",
    });

    expect(fake.calls[0]?.input).toBe("/api/v1/inventory/units/unit_1/reserve");
    expect(fake.calls[0]?.init?.method).toBe("POST");
    expect(bodyOf(fake.calls[0] as FetchCall)).toEqual({
      buyer: { document: "000", name: "Buyer" },
      paymentMethod: "pix",
      salePriceCents: 12000000,
      signalAmountCents: 100000,
    });
    expect(fake.calls[1]?.input).toBe("/api/v1/inventory/units/unit_1/sell");
    expect(bodyOf(fake.calls[1] as FetchCall)).toEqual({
      buyer: { email: "buyer@example.com", name: "Buyer" },
      paidAmountCents: 12000000,
      paymentMethod: "bank_transfer",
      salePriceCents: 12000000,
    });
    expect(fake.calls[2]?.input).toBe(
      "/api/v1/inventory/units/unit_1/reservation/release",
    );
    expect(bodyOf(fake.calls[2] as FetchCall)).toEqual({
      reason: "Cliente desistiu",
      saleId: "sale_1",
    });
  });
});
