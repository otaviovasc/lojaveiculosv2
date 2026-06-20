import { describe, expect, it, vi } from "vitest";
import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { AuthorizationError } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  InternalHealthSnapshot,
  InternalMonitoringRepository,
} from "../../ports/internalMonitoringRepository.js";
import { getInternalHealthSnapshot } from "./getInternalHealthSnapshot.js";
import { InternalMonitoringScopeError } from "./serviceSupport.js";

describe("getInternalHealthSnapshot", () => {
  it("normalizes limit, reads scoped snapshot, and audits access", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createRepository();

    const result = await getInternalHealthSnapshot(
      createContext({ audit }),
      { limit: 250 },
      { internalMonitoringRepository: repository },
    );

    expect(result.status).toBe("warning");
    expect(repository.getHealthSnapshot).toHaveBeenCalledWith({
      limit: 100,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "internal.health.read",
        entityId: "store_1",
        outcome: "succeeded",
      }),
    );
    const [[auditEvent]] = audit.record.mock.calls as unknown as [[AuditEvent]];
    expect(auditEvent.metadata).toEqual(
      expect.objectContaining({
        limit: 100,
        requestedLimit: 250,
        status: "warning",
      }),
    );
  });

  it("requires audit read permission", async () => {
    await expect(
      getInternalHealthSnapshot(
        createContext({ permissions: [] }),
        { limit: 40 },
        { internalMonitoringRepository: createRepository() },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("requires store and tenant scope", async () => {
    await expect(
      getInternalHealthSnapshot(
        createContext({ storeId: null }),
        { limit: 40 },
        { internalMonitoringRepository: createRepository() },
      ),
    ).rejects.toBeInstanceOf(InternalMonitoringScopeError);
  });
});

function createContext(
  overrides: Partial<ServiceContext> & { audit?: AuditSink } = {},
): ServiceContext {
  return {
    actor: { id: "user_1", kind: "user" },
    audit: overrides.audit ?? { record: vi.fn(async () => undefined) },
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    permissions: overrides.permissions ?? ["audit.read"],
    requestId: "req_1",
    storeId: "storeId" in overrides ? overrides.storeId : "store_1",
    tenantId: "tenantId" in overrides ? overrides.tenantId : "tenant_1",
  };
}

function createRepository(): InternalMonitoringRepository {
  return {
    getHealthSnapshot: vi.fn(async () => snapshot),
  };
}

const snapshot: InternalHealthSnapshot = {
  actionMetrics: [],
  actorMetrics: [],
  alerts: [],
  categoryMetrics: [],
  events: [],
  failures: [],
  generatedAt: new Date("2026-01-01T10:00:00.000Z"),
  outcomeMetrics: [],
  severityMetrics: [],
  sinkMetrics: [],
  status: "warning",
  summary: {
    criticalEvents: 0,
    deniedEvents: 2,
    failedEvents: 0,
    openSinkFailures: 0,
    recentEvents: 12,
    uniqueActors: 3,
    warningEvents: 2,
  },
};
