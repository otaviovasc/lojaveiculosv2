import { describe, expect, it } from "vitest";
import {
  createServices,
  createStoreApp,
  validSimulationBody,
} from "./credereFinancing.controller.testSupport.js";

describe("Credere financing simulation schema", () => {
  it.each([
    [
      "applicant phone",
      (body: SimulationBody) =>
        delete (body.applicant as Partial<SimulationBody["applicant"]>).phone,
    ],
    [
      "vehicle licensing city",
      (body: SimulationBody) =>
        delete (body.vehicle as Partial<SimulationBody["vehicle"]>)
          .licensingCity,
    ],
    [
      "vehicle licensing UF",
      (body: SimulationBody) =>
        delete (body.vehicle as Partial<SimulationBody["vehicle"]>).licensingUf,
    ],
    [
      "vehicle Molicar code",
      (body: SimulationBody) =>
        delete (body.vehicle as Partial<SimulationBody["vehicle"]>).molicarCode,
    ],
  ])("rejects missing %s", async (_label, mutate) => {
    const services = createServices();
    const body = validSimulationBody();
    mutate(body);

    const response = await postSimulation(services, body);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "FINANCING_REQUEST_VALIDATION_FAILED",
    });
    expect(services.store.createSimulation).not.toHaveBeenCalled();
  });

  it("rejects a down payment that consumes the full vehicle price", async () => {
    const services = createServices();
    const body = validSimulationBody();
    body.terms.downPaymentCents = body.vehicle.priceCents;

    const response = await postSimulation(services, body);

    expect(response.status).toBe(400);
    expect(services.store.createSimulation).not.toHaveBeenCalled();
  });

  it("rejects an idempotency key longer than the persisted limit", async () => {
    const services = createServices();

    const response = await createStoreApp(services).request(
      "/api/v1/financing/credere/simulations",
      {
        body: JSON.stringify(validSimulationBody()),
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "x".repeat(192),
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
    expect(services.store.createSimulation).not.toHaveBeenCalled();
  });

  it.each([
    "sellerCpf",
    "providerStoreId",
    "externalStoreId",
    "credereStoreId",
  ])("rejects forbidden provider/seller field %s", async (field) => {
    const services = createServices();
    const response = await postSimulation(services, {
      ...validSimulationBody(),
      [field]: "forbidden",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "FINANCING_REQUEST_VALIDATION_FAILED",
    });
    expect(services.store.createSimulation).not.toHaveBeenCalled();
  });
});

function postSimulation(
  services: ReturnType<typeof createServices>,
  body: unknown,
) {
  return createStoreApp(services).request(
    "/api/v1/financing/credere/simulations",
    {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem_schema",
      },
      method: "POST",
    },
  );
}

type SimulationBody = ReturnType<typeof validSimulationBody>;
