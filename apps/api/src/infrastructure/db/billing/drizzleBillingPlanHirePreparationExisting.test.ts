import { describe, expect, it } from "vitest";
import {
  expireStaleOpenHires,
  STALE_HIRE_WITHOUT_SESSION_MS,
  type PrepareHireInput,
} from "./drizzleBillingPlanHirePreparationExisting.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

const input = {
  storeId: "store_1",
  tenantId: "tenant_1",
} as PrepareHireInput;

describe("expireStaleOpenHires", () => {
  it("expires an open hire whose latest checkout session is expired", async () => {
    const hire = openHire({ id: "hire_1", status: "checkout_created" });
    const db = createFakeDb({
      hires: [hire],
      sessions: [
        {
          expiresAt: new Date(Date.now() - 5 * 60 * 1000),
          planHireId: "hire_1",
        },
      ],
    });

    await expect(expireStaleOpenHires(db, input)).resolves.toBeUndefined();

    expect(hire).toMatchObject({
      failureCode: "checkout_expired",
      status: "expired",
    });
    expect(db.transitions).toEqual([
      expect.objectContaining({
        failureCode: "checkout_expired",
        fromStatus: "checkout_created",
        hireId: "hire_1",
        toStatus: "expired",
      }),
    ]);
  });

  it("expires an open hire without a session untouched for over 70 minutes", async () => {
    const hire = openHire({
      id: "hire_1",
      updatedAt: new Date(Date.now() - STALE_HIRE_WITHOUT_SESSION_MS - 1000),
    });
    const db = createFakeDb({ hires: [hire], sessions: [] });

    await expect(expireStaleOpenHires(db, input)).resolves.toBeUndefined();

    expect(hire.status).toBe("expired");
    expect(db.transitions).toHaveLength(1);
  });

  it("still blocks a recent open hire without a checkout session", async () => {
    const hire = openHire({ id: "hire_1" });
    const db = createFakeDb({ hires: [hire], sessions: [] });

    await expect(expireStaleOpenHires(db, input)).rejects.toMatchObject({
      code: "hire_in_progress",
    });
    expect(hire.status).toBe("created");
    expect(db.transitions).toHaveLength(0);
  });

  it("keeps a payment_pending hire with a valid checkout session blocking", async () => {
    const hire = openHire({ id: "hire_1", status: "payment_pending" });
    const db = createFakeDb({
      hires: [hire],
      sessions: [
        {
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          planHireId: "hire_1",
        },
      ],
    });

    await expect(expireStaleOpenHires(db, input)).rejects.toMatchObject({
      code: "hire_in_progress",
    });
    expect(hire.status).toBe("payment_pending");
    expect(db.transitions).toHaveLength(0);
  });

  it("keeps an open hire blocking when the latest session has no expiry", async () => {
    const hire = openHire({ id: "hire_1", status: "activation_pending" });
    const db = createFakeDb({
      hires: [hire],
      sessions: [{ expiresAt: null, planHireId: "hire_1" }],
    });

    await expect(expireStaleOpenHires(db, input)).rejects.toMatchObject({
      code: "hire_in_progress",
    });
    expect(hire.status).toBe("activation_pending");
  });

  it("expires stale hires while still blocking on a fresh one", async () => {
    const stale = openHire({
      id: "hire_stale",
      updatedAt: new Date(Date.now() - STALE_HIRE_WITHOUT_SESSION_MS - 1000),
    });
    const fresh = openHire({ id: "hire_fresh", status: "payment_pending" });
    const db = createFakeDb({
      hires: [stale, fresh],
      sessions: [
        {
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          planHireId: "hire_fresh",
        },
      ],
    });

    await expect(expireStaleOpenHires(db, input)).rejects.toMatchObject({
      code: "hire_in_progress",
    });
    expect(stale.status).toBe("expired");
    expect(fresh.status).toBe("payment_pending");
    expect(db.transitions).toHaveLength(1);
  });
});

type FakeHire = {
  failureCode: string | null;
  id: string;
  status: string;
  storeId: string;
  tenantId: string;
  updatedAt: Date;
};

function openHire(overrides: Partial<FakeHire>): FakeHire {
  return {
    failureCode: null,
    id: "hire_1",
    status: "created",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: new Date(),
    ...overrides,
  };
}

function createFakeDb(rows: {
  hires: FakeHire[];
  sessions: {
    expiresAt: Date | null;
    planHireId: string;
  }[];
}) {
  const transitions: Record<string, unknown>[] = [];
  const db = {
    transitions,
    insert() {
      return {
        async values(row: Record<string, unknown>) {
          transitions.push(row);
        },
      };
    },
    select(selection?: Record<string, unknown>) {
      const isSessionSelect = selection !== undefined;
      return {
        from() {
          return {
            where(condition: unknown) {
              const hireId = extractHireId(condition);
              const matchedSessions = rows.sessions.filter(
                (session) => session.planHireId === hireId,
              );
              const builder = {
                orderBy() {
                  return builder;
                },
                async limit() {
                  return isSessionSelect ? matchedSessions.slice(0, 1) : [];
                },
                then(
                  onFulfilled?: ((value: unknown[]) => unknown) | null,
                  onRejected?: ((reason: unknown) => unknown) | null,
                ) {
                  return Promise.resolve(
                    isSessionSelect ? matchedSessions : rows.hires,
                  ).then(onFulfilled, onRejected);
                },
              };
              return builder;
            },
          };
        },
      };
    },
    update() {
      return {
        set(values: Partial<FakeHire>) {
          return {
            where(condition: unknown) {
              return {
                async returning() {
                  const hireId = extractHireId(condition);
                  const updated = rows.hires.filter(
                    (hire) => hire.id === hireId,
                  );
                  for (const hire of updated) Object.assign(hire, values);
                  return updated;
                },
              };
            },
          };
        },
      };
    },
  };
  return db as unknown as DrizzleBillingClient & {
    transitions: typeof transitions;
  };
}

function extractHireId(condition: unknown): string | null {
  if (!condition || typeof condition !== "object") return null;
  const value = (condition as { value?: unknown }).value;
  if (typeof value === "string" && value.startsWith("hire_")) return value;
  const chunks = (condition as { queryChunks?: unknown[] }).queryChunks;
  if (!Array.isArray(chunks)) return null;
  for (const chunk of chunks) {
    const found = extractHireId(chunk);
    if (found) return found;
  }
  return null;
}
