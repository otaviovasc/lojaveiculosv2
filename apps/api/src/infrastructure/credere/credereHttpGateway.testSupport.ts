import { createCredereHttpGateway } from "./credereHttpGateway.js";

export function gateway(fetcher: typeof fetch) {
  return createCredereHttpGateway({
    auth: { clientId: "client_1", clientSecret: "secret_1" },
    fetch: fetcher,
  });
}

export function tokenSet() {
  return {
    accessToken: "access_1",
    expiresAt: null,
    providerAccountId: "411",
    refreshToken: "refresh_1",
    scope: "simulator proposals",
    tokenType: "bearer",
  };
}

export function simulationInput() {
  return {
    assetValueCents: 6000000,
    bankFebrabanCodes: ["655", "623"],
    conditions: [{ downPaymentCents: 3000000, installments: 24 }],
    retrieveLeadCpfCnpj: "123.456.789-09",
    sellerCpf: "98765432100",
    vehicle: {
      assetValueCents: 6000000,
      credereVehicleModelId: "20089",
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      manufactureYear: 2022,
      modelYear: 2023,
      zeroKm: false,
    },
  };
}

export function simulationFixture() {
  return { data: { conditions: [], success: true, uuid: "sim_1" } };
}

export function bank(code: string, active: boolean, status: string) {
  return {
    bank_credential: { active, status },
    code,
    name: `Bank ${code}`,
    tradename: `B${code}`,
  };
}

export function condition(
  id: string,
  endedAt: string | null,
  success: boolean,
  available: boolean,
) {
  const processTask = endedAt ? { ended_at: endedAt } : null;
  return {
    available,
    bank: { febraban_code: "655", nickname: "BV" },
    id,
    process_task: processTask,
    success,
  };
}

export function jsonResponse(body: unknown, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { headers, status });
}
