// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappVisitsPage } from "./CrmWhatsappVisitsPage";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";
import type { CrmLeadVisit, CrmVisitsApi } from "./crmVisitsApi";

describe("CrmWhatsappVisitsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates a visit from the active linked WhatsApp session", async () => {
    const user = userEvent.setup();
    const scheduledAt = toDatetimeLocal(new Date());
    const created = createVisit({
      id: "visit_2",
      notes: "Receber na loja",
      scheduledAt: new Date(scheduledAt).toISOString(),
    });
    const createVisitMock = vi.fn(async () => created);
    const api = createVisitsApi({
      createVisit: createVisitMock,
      listVisits: vi.fn(async () => []),
    });

    renderPage(api);

    expect(
      await screen.findByText("Nenhuma visita nesta visao."),
    ).toBeVisible();
    await user.type(screen.getByLabelText("Data da visita"), scheduledAt);
    await user.type(
      screen.getByLabelText("Observacoes da visita"),
      created.notes!,
    );
    await user.click(screen.getByRole("button", { name: /criar/i }));

    await waitFor(() =>
      expect(createVisitMock).toHaveBeenCalledWith({
        leadId: "22000000-0000-4000-8000-000000000001",
        notes: "Receber na loja",
        scheduledAt: new Date(scheduledAt).toISOString(),
        sessionId: "34000000-0000-4000-8000-000000000001",
      }),
    );
    expect(screen.getByText("Receber na loja")).toBeVisible();
  });

  it("updates visit status from the operations list", async () => {
    const user = userEvent.setup();
    const visit = createVisit();
    const completeVisit = vi.fn(async () => ({
      ...visit,
      status: "completed" as const,
    }));
    const api = createVisitsApi({
      completeVisit,
      listVisits: vi.fn(async () => [visit]),
    });

    renderPage(api);

    expect(await screen.findByText("Receber cliente")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Concluir visita" }));

    await waitFor(() => expect(completeVisit).toHaveBeenCalledWith(visit.id));
  });
});

function renderPage(api: CrmVisitsApi) {
  render(
    <CrmWhatsappVisitsPage
      activeSession={createSession()}
      api={api}
      canManage
      canRead
    />,
  );
}

function createVisitsApi(overrides: Partial<CrmVisitsApi>): CrmVisitsApi {
  return new Proxy(overrides, {
    get(target, prop: string | symbol) {
      if (prop in target) return target[prop as keyof CrmVisitsApi];
      return vi.fn(async () => {
        throw new Error(`Unexpected visits API call: ${String(prop)}`);
      });
    },
  }) as CrmVisitsApi;
}

function toDatetimeLocal(value: Date) {
  const local = new Date(value);
  local.setHours(14, 0, 0, 0);
  const offset = local.getTimezoneOffset();
  const adjusted = new Date(local.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function createSession(): CrmWhatsappSession {
  return {
    buyerName: "Lead Visita",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    id: "34000000-0000-4000-8000-000000000001",
    leadId: "22000000-0000-4000-8000-000000000001",
    status: "ACTIVE",
    uuid: "34000000-0000-4000-8000-000000000001",
  };
}

function createVisit(overrides: Partial<CrmLeadVisit> = {}): CrmLeadVisit {
  const now = new Date();
  now.setHours(14, 0, 0, 0);
  return {
    assignedUserId: null,
    createdAt: now.toISOString(),
    id: "visit_1",
    leadId: "22000000-0000-4000-8000-000000000001",
    notes: "Receber cliente",
    scheduledAt: now.toISOString(),
    status: "scheduled",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: now.toISOString(),
    ...overrides,
  };
}
