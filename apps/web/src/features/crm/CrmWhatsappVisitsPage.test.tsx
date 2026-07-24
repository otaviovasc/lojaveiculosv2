// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ComponentProps } from "react";
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
    expect(screen.queryByLabelText("Data da visita")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nova visita" }));
    expect(
      screen.getByRole("heading", { name: "Confirme o cliente" }),
    ).toBeVisible();
    expect(screen.getByText("Lead Visita")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await user.type(screen.getByLabelText("Data da visita"), scheduledAt);
    await user.type(
      screen.getByLabelText("Observacoes da visita"),
      created.notes!,
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen.getByRole("heading", { name: "Revise o agendamento" }),
    ).toBeVisible();
    expect(screen.getByText("Receber na loja")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Criar visita" }));

    await waitFor(() =>
      expect(createVisitMock).toHaveBeenCalledWith({
        leadId: "22000000-0000-4000-8000-000000000001",
        listingId: null,
        notes: "Receber na loja",
        scheduledAt: new Date(scheduledAt).toISOString(),
        sessionId: "34000000-0000-4000-8000-000000000001",
      }),
    );
    expect(screen.getByText("Receber na loja")).toBeVisible();
    expect(screen.getByRole("button", { name: "Nova visita" })).toBeVisible();
  });

  it("optionally links an inventory vehicle to the visit", async () => {
    const user = userEvent.setup();
    const scheduledAt = toDatetimeLocal(new Date());
    const listingId = "44000000-0000-4000-8000-000000000001";
    const created = createVisit({
      id: "visit_vehicle",
      listingId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      vehicleTitle: "SUV Prata",
    });
    const createVisitMock = vi.fn(async () => created);
    const api = createVisitsApi({
      createVisit: createVisitMock,
      listVisits: vi.fn(async () => []),
    });
    const listVehicles = vi.fn(async () => [
      {
        listingId,
        mediaCount: 0,
        status: "published",
        title: "SUV Prata",
      },
    ]);

    renderPage(api, createSession(), true, listVehicles);
    await screen.findByText("Nenhuma visita nesta visao.");
    await user.click(screen.getByRole("button", { name: "Nova visita" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Data da visita"), scheduledAt);
    await user.click(
      await screen.findByRole("button", { name: "Veículo de interesse" }),
    );
    await user.click(await screen.findByRole("option", { name: "SUV Prata" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("SUV Prata")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Criar visita" }));

    await waitFor(() =>
      expect(createVisitMock).toHaveBeenCalledWith(
        expect.objectContaining({ listingId }),
      ),
    );
    expect(listVehicles).toHaveBeenCalled();
    expect(screen.getByText("SUV Prata")).toBeVisible();
  });

  it("preserves the draft when going back and clears it on cancel", async () => {
    const user = userEvent.setup();
    const scheduledAt = toDatetimeLocal(new Date());
    const api = createVisitsApi({ listVisits: vi.fn(async () => []) });

    renderPage(api);
    await screen.findByText("Nenhuma visita nesta visao.");
    await user.click(screen.getByRole("button", { name: "Nova visita" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Data da visita"), scheduledAt);
    await user.type(
      screen.getByLabelText("Observacoes da visita"),
      "Separar chave",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(screen.getByLabelText("Data da visita")).toHaveValue(scheduledAt);
    expect(screen.getByLabelText("Observacoes da visita")).toHaveValue(
      "Separar chave",
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText("Data da visita")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nova visita" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Data da visita")).toHaveValue("");
    expect(screen.getByLabelText("Observacoes da visita")).toHaveValue("");
  });

  it("blocks creation when no selected conversation is linked to a lead", async () => {
    const user = userEvent.setup();
    const api = createVisitsApi({ listVisits: vi.fn(async () => []) });

    renderPage(api, null);
    await screen.findByText("Nenhuma visita nesta visao.");
    await user.click(screen.getByRole("button", { name: "Nova visita" }));

    expect(
      screen.getByText("Nenhuma conversa com lead selecionada"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
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

  it("keeps tomorrow visits out of upcoming", async () => {
    const user = userEvent.setup();
    const tomorrow = createVisit({
      id: "visit_tomorrow",
      notes: "Visita de amanha",
      scheduledAt: dateAtOffset(1).toISOString(),
    });
    const future = createVisit({
      id: "visit_future",
      notes: "Visita futura",
      scheduledAt: dateAtOffset(3).toISOString(),
    });
    const api = createVisitsApi({
      listVisits: vi.fn(async () => [tomorrow, future]),
    });

    renderPage(api);

    const tomorrowButton = await screen.findByRole("button", {
      name: /Amanha/i,
    });
    await waitFor(() => expect(tomorrowButton).toHaveTextContent("1"));
    await user.click(tomorrowButton);
    expect(screen.getByText("Visita de amanha")).toBeVisible();
    expect(screen.queryByText("Visita futura")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Proximas/i }));
    expect(screen.getByText("Visita futura")).toBeVisible();
    expect(screen.queryByText("Visita de amanha")).not.toBeInTheDocument();
  });

  it("keeps the timeline visible but disables mutations without permission", async () => {
    const api = createVisitsApi({
      listVisits: vi.fn(async () => [createVisit()]),
    });

    renderPage(api, createSession(), false);

    expect(await screen.findByText("Receber cliente")).toBeVisible();
    expect(screen.getByRole("button", { name: "Nova visita" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Concluir visita" }),
    ).toBeDisabled();
  });
});

function renderPage(
  api: CrmVisitsApi,
  activeSession: CrmWhatsappSession | null = createSession(),
  canManage = true,
  listVehicles?: ComponentProps<typeof CrmWhatsappVisitsPage>["listVehicles"],
) {
  render(
    <CrmWhatsappVisitsPage
      activeSession={activeSession}
      api={api}
      canManage={canManage}
      canRead
      {...(listVehicles ? { listVehicles } : {})}
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

function dateAtOffset(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(14, 0, 0, 0);
  return value;
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
    listingId: null,
    notes: "Receber cliente",
    scheduledAt: now.toISOString(),
    status: "scheduled",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: now.toISOString(),
    vehicleTitle: null,
    ...overrides,
  };
}
