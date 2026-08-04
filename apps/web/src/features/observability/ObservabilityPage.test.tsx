// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObservabilityPage } from "./ObservabilityPage";
import type { ObservabilitySnapshot } from "./apiClient";

const mocks = vi.hoisted(() => ({
  getHealth: vi.fn(),
}));

vi.mock("./apiClient", () => ({
  createRuntimeObservabilityApi: async () => ({
    getHealth: mocks.getHealth,
  }),
}));

describe("ObservabilityPage", () => {
  afterEach(() => {
    cleanup();
    mocks.getHealth.mockReset();
  });

  it("loads the platform snapshot and exposes the selected event context", async () => {
    mocks.getHealth.mockResolvedValue(snapshot);

    render(<ObservabilityPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Observability command center",
      }),
    ).toBeVisible();
    expect(screen.getByText("inventory.create")).toBeVisible();
    const eventJson = screen.getByLabelText(
      "Evento selecionado em JSON",
    ) as HTMLTextAreaElement;
    expect(eventJson.value).toContain('"requestId": "req_1"');
    expect(mocks.getHealth).toHaveBeenCalledWith({ limit: 50 });
  });
});

const snapshot: ObservabilitySnapshot = {
  actionMetrics: [],
  actorMetrics: [],
  alerts: [],
  categoryMetrics: [],
  events: [
    {
      action: "inventory.create",
      actorId: "user_1",
      actorKind: "user",
      category: "data_change",
      correlationId: "corr_1",
      criticality: "high",
      entityId: "vehicle_1",
      entityType: "vehicle",
      failureTier: "required",
      id: "event_1",
      occurredAt: "2026-01-01T10:00:00.000Z",
      outcome: "failed",
      providerEventId: null,
      providerName: null,
      metadata: { code: "VALIDATION_ERROR" },
      requestContext: {
        causationId: null,
        correlationId: "corr_1",
        method: "POST",
        path: "/api/v1/inventory",
        requestId: "req_1",
      },
      requestId: "req_1",
      severity: "error",
      source: { service: "api" },
      storeId: "store_1",
      summary: "Vehicle creation failed",
      tags: ["inventory"],
      tenantId: "tenant_1",
    },
  ],
  failures: [],
  generatedAt: "2026-01-01T10:01:00.000Z",
  outcomeMetrics: [],
  severityMetrics: [],
  sinkMetrics: [],
  status: "critical",
  summary: {
    criticalEvents: 0,
    deniedEvents: 0,
    failedEvents: 1,
    openSinkFailures: 0,
    recentEvents: 1,
    uniqueActors: 1,
    warningEvents: 0,
  },
};
