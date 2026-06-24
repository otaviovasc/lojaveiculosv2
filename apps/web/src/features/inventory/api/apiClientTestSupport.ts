export type FetchCall = {
  init: RequestInit | undefined;
  input: RequestInfo | URL;
};

export function createFakeFetch(payloads: unknown[]) {
  const calls: FetchCall[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ init, input });

    if (String(input).startsWith("https://upload.local/")) {
      return new Response(null, { status: 200 });
    }

    return new Response(JSON.stringify(payloads.shift() ?? {}), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };

  return { calls, fetch: fakeFetch };
}

export function callAt(calls: FetchCall[], index: number) {
  const call = calls[index];

  if (!call) throw new Error(`Missing fetch call ${index}`);

  return call;
}

export function bodyOf(call: FetchCall) {
  return JSON.parse(String(call.init?.body)) as Record<string, unknown>;
}

export function listingDetailPayload() {
  return {
    costs: [],
    listing: {
      catalog: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      doors: null,
      engineDisplacement: null,
      fuelType: null,
      id: "listing_1",
      internalNotes: null,
      manufactureYear: null,
      mileageKm: null,
      modelYear: null,
      plate: "ABC1D23",
      priceCents: 12000000,
      status: "draft",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Inventory title",
      transmission: null,
      trimName: null,
      unitIds: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    media: [],
    priceHistory: [],
    status: "ready",
    statusHistory: [],
    units: [],
  };
}
