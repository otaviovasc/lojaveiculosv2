import { vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import type {
  FinancingProviderGateway,
  FinancingServicePorts,
} from "./serviceSupport.js";
import type { createCredereSimulation } from "./simulationCreateService.js";

export const fixedNow = new Date("2026-07-27T12:00:00.000Z");

export function createPorts(
  repository: ReturnType<typeof createMemoryFinancingRepository>,
  gatewayOverrides: Partial<FinancingProviderGateway> & {
    clock?: () => Date;
  } = {},
): FinancingServicePorts {
  return {
    clock: gatewayOverrides.clock ?? (() => fixedNow),
    gateway: {
      createAuthorizationUrl: async (input) =>
        `https://credere.example.test/oauth?state=${input.state}`,
      createLead: async (input) => ({
        birthdate: input.lead.birthdate ?? null,
        cpfCnpj: input.lead.cpfCnpj,
        email: input.lead.email ?? null,
        hasCnh: input.lead.hasCnh ?? null,
        id: "lead_1",
        monthlyIncomeCents: input.lead.monthlyIncomeCents ?? null,
        name: input.lead.name,
        phoneNumber: input.lead.phoneNumber,
      }),
      createSimulation: async () =>
        pendingSimulation("credere_inquiry_default"),
      exchangeAuthorizationCode: async () => tokenSet(),
      getLead: async () => null,
      getRequiredFields: async () => ({ lead: null, requirements: {} }),
      getSimulation: async () => pendingSimulation("credere_inquiry_default"),
      listIntegratedBanks: async () => [
        {
          active: true,
          code: "655",
          name: "BV",
          status: "okay",
          tradename: "BV",
        },
        {
          active: true,
          code: "623",
          name: "PAN",
          status: "okay",
          tradename: "PAN",
        },
      ],
      listSimulationCandidates: async () => [],
      listSellers: async () => [
        {
          active: true,
          cpf: "98765432100",
          id: "seller_1",
          name: "Seller One",
        },
      ],
      listStores: async () => [
        {
          cnpj: "00.000.000/0001-00",
          displayName: "Credere Matriz",
          id: "credere_store_1",
          name: "Credere Matriz",
          status: "active",
        },
      ],
      listVehicleModelsByFipe: async () => [
        {
          available: true,
          brand: "VW",
          fipeCode: "005340-6",
          fuelType: "Flex",
          id: "model_1",
          molicarCode: "01906108-0",
          name: "Gol",
          version: "1.0 MPI",
          yearEnd: 2025,
          yearStart: 2020,
        },
      ],
      lookupVehicleModel: async () => ({
        active: true,
        brand: "VW",
        fipeCode: null,
        id: "model_1",
        molicarCode: "01906108-0",
        name: "Gol",
        version: null,
        yearEnd: null,
        yearStart: null,
      }),
      provider: "credere",
      refreshToken: async () => tokenSet(),
      revokeToken: async () => undefined,
      supportsPkce: false,
      updateLead: async (input) => ({
        birthdate: input.lead.birthdate ?? null,
        cpfCnpj: input.lead.cpfCnpj,
        email: input.lead.email ?? null,
        hasCnh: input.lead.hasCnh ?? null,
        id: "lead_1",
        monthlyIncomeCents: input.lead.monthlyIncomeCents ?? null,
        name: input.lead.name,
        phoneNumber: input.lead.phoneNumber,
      }),
      ...gatewayOverrides,
    },
    repository,
  };
}

export function createAgencyContext(
  permissions: readonly string[] = ["financing.connection.manage"],
  overrides: { tenantId?: string } = {},
) {
  return createServiceContext({
    actor: { id: "user_agency", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    permissions,
    request: {
      idempotencyKey: "request_idem_1",
      ipAddress: "127.0.0.1",
      requestId: "request_1",
      userAgent: "vitest",
    },
    storeId: null,
    tenantId: overrides.tenantId ?? "tenant_1",
  });
}

export function createStoreContext(
  permissions: readonly string[],
  overrides: {
    entitlements?: readonly string[];
    storeId?: string;
    tenantId?: string;
  } = {},
) {
  return {
    ...createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record: vi.fn(async () => undefined) },
      permissions,
      request: {
        idempotencyKey: "request_idem_1",
        ipAddress: "127.0.0.1",
        requestId: "request_1",
        userAgent: "vitest",
      },
      storeId: overrides.storeId ?? "store_1",
      tenantId: overrides.tenantId ?? "tenant_1",
    }),
    entitlements: overrides.entitlements ?? ["simulations"],
  };
}

export function tokenSet() {
  return {
    accessToken: "access_token_1",
    expiresAt: null,
    providerAccountId: "provider_account_1",
    refreshToken: "refresh_token_1",
    scope: "simulator proposals",
    tokenType: "Bearer",
  };
}

export function pendingSimulation(uuid: string) {
  return {
    conditions: [],
    createdAt: fixedNow.toISOString(),
    providerRequestId: "provider_request_default",
    reason: null,
    status: "pending" as const,
    success: null,
    uuid,
  };
}

export function simulationInput(
  overrides: Partial<CreateParameters> = {},
): CreateParameters {
  return {
    amountCents: 4_000_000,
    consent: {
      accepted: true,
      acceptedAt: fixedNow,
      termsVersion: "simulations-2026-07",
    },
    customer: {
      birthDate: "1990-01-01",
      document: "123.456.789-01",
      email: "ana@example.test",
      monthlyIncomeCents: 850_000,
      name: "Ana Cliente",
      phone: "11999999999",
    },
    downPaymentCents: 1_000_000,
    idempotencyKey: "idem_simulation_1",
    installmentCounts: [48],
    listingId: "listing_1",
    processBankSuggestedConditions: true,
    unitId: "unit_1",
    vehicle: {
      assetValueCents: 6_000_000,
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      manufactureYear: 2022,
      modelYear: 2023,
      vehicleMolicarCode: "01906108-0",
      zeroKm: false,
    },
    ...overrides,
  };
}

type CreateParameters = Parameters<typeof createCredereSimulation>[1];
