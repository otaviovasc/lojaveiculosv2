import { Hono } from "hono";
import { vi } from "vitest";
import type { RoleKey } from "@lojaveiculosv2/shared";
import type { BillingManagedBy } from "../../../shared/serviceContext.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import {
  createAgencyCredereFinancingFeature,
  createCredereFinancingFeature,
} from "./credereFinancing.controller.js";
import type { CredereFinancingServices } from "./credereFinancingServices.js";

export const tenantId = "tenant_1";
export const storeId = "store_1";

function defaultStorePermissions(contextOptions: {
  billingManagedBy?: BillingManagedBy;
  membershipRole?: RoleKey;
  permissions?: readonly string[];
}) {
  if (contextOptions.permissions) return contextOptions.permissions;
  const permissions = [
    "financing.simulation.create",
    "financing.simulation.read",
  ];
  if (
    contextOptions.billingManagedBy === "store_owner" &&
    contextOptions.membershipRole === "owner"
  ) {
    permissions.push("financing.connection.manage");
  }
  return permissions;
}

export function createAgencyApp(services: CredereFinancingServices) {
  const app = new Hono();
  app.route(
    "/api/v1/agency",
    createAgencyCredereFinancingFeature({
      accountContextFactory: async (_context, scope) => ({
        profile: {
          clerkUserId: "clerk_agency",
          email: "agency@test.local",
          emailVerified: true,
          name: "Agency",
        },
        serviceContext: createServiceContext({
          actor: { id: "user_agency", kind: "user" },
          billingManagedBy: "agency",
          permissions: ["financing.connection.manage"] as never,
          request: { requestId: "request_1" },
          tenantId: scope.tenantId,
        }),
      }),
      services,
    }),
  );
  return app;
}

export function createStoreApp(
  services: CredereFinancingServices,
  contextOptions: {
    billingManagedBy?: BillingManagedBy;
    membershipRole?: RoleKey;
    permissions?: readonly string[];
    storeId?: string;
    tenantId?: string;
  } = {},
) {
  const app = new Hono();
  app.route(
    "/api/v1/financing",
    createCredereFinancingFeature({
      contextFactory: async () =>
        Object.assign(
          createServiceContext({
            actor: { id: "user_store", kind: "user" },
            permissions: defaultStorePermissions(contextOptions) as never,
            request: { requestId: "request_1" },
            storeId: contextOptions.storeId ?? storeId,
            tenantId: contextOptions.tenantId ?? tenantId,
            ...(contextOptions.billingManagedBy
              ? { billingManagedBy: contextOptions.billingManagedBy }
              : {}),
            ...(contextOptions.membershipRole
              ? { membershipRole: contextOptions.membershipRole }
              : {}),
          }),
          { entitlements: ["financing"] },
        ),
      services,
    }),
  );
  return app;
}

export function createServices(
  overrides: {
    agency?: Partial<CredereFinancingServices["agency"]>;
    oauth?: Partial<CredereFinancingServices["oauth"]>;
    store?: Partial<CredereFinancingServices["store"]>;
  } = {},
): CredereFinancingServices {
  return {
    agency: {
      deleteConnection: vi.fn(async () => ({ ok: true })),
      deleteStoreMapping: vi.fn(async () => ({ ok: true })),
      getConnection: vi.fn(async () => ({
        configured: false,
        connected: false,
        connection: null,
        storeMappings: [],
      })),
      listProviderStores: vi.fn(async () => ({ stores: [] })),
      startOAuth: vi.fn(async () => ({
        authorizationUrl: "https://app.meucredere.com.br/api/v1/authorize",
      })),
      upsertStoreMapping: vi.fn(async () => ({
        externalStoreId: "external_1",
        storeId,
      })),
      ...overrides.agency,
    },
    oauth: {
      completeCallback: vi.fn(async () => ({ ok: true })),
      ...overrides.oauth,
    },
    store: {
      createSimulation: vi.fn(async () => ({
        inquiryId: "inquiry_1",
        status: "approved",
      })),
      getRequiredFields: vi.fn(async () => ({ missingFields: [] })),
      getSimulation: vi.fn(async () => ({ inquiryId: "inquiry_1" })),
      getStatus: vi.fn(async () => ({
        configured: false,
        mappedStoreAlias: null,
        usableBanks: [],
      })),
      listSimulations: vi.fn(async () => ({ simulations: [] })),
      refreshSimulation: vi.fn(async () => ({
        inquiryId: "inquiry_1",
        status: "processing",
      })),
      resolveFipeVehicle: vi.fn(async () => ({
        candidates: [],
        status: "not_found",
      })),
      syncSimulations: vi.fn(async () => ({
        created: 0,
        remoteCount: 0,
        skipped: 0,
        syncedAt: "2026-07-27T12:00:00.000Z",
        updated: 0,
      })),
      ...overrides.store,
    },
  };
}

export function validSimulationBody() {
  return {
    applicant: {
      birthDate: "1990-01-01",
      document: "529.982.247-25",
      email: "buyer@test.local",
      monthlyIncomeCents: 600000,
      name: "Buyer Test",
      phone: "(11) 98888-7777",
    },
    consent: {
      creditSimulation: true,
      personalData: true,
    },
    leadId: "lead_1",
    terms: {
      downPaymentCents: 300000,
      financedAmountCents: 700000,
      installmentCounts: [24],
      processBankSuggestedConditions: true,
      requestedBankCodes: ["655"],
    },
    vehicle: {
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      manufactureYear: 2022,
      modelYear: 2023,
      molicarCode: "01906108-0",
      priceCents: 1000000,
      zeroKm: false,
    },
  };
}
