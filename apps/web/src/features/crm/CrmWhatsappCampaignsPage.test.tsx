// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappCampaignsPage } from "./CrmWhatsappCampaignsPage";
import {
  createCampaign,
  createCampaignDetail,
  createLead,
  createSession,
} from "./CrmWhatsappCampaignsPage.testFixtures";

describe("CrmWhatsappCampaignsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates persistent campaigns for selected sessions", async () => {
    const user = userEvent.setup();
    const onCreateCampaign = vi.fn(async () => createCampaign());
    render(
      <CrmWhatsappCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        sessions={[createSession({ buyerName: "Ana" })]}
        tags={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    expect(
      screen.getByRole("navigation", { name: /etapas do fluxo/i }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /Ana/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      screen.getByLabelText(/inicio da campanha/i),
      "2099-01-01T10:00",
    );
    await user.click(screen.getByRole("button", { name: /agendar campanha/i }));

    await waitFor(() =>
      expect(onCreateCampaign).toHaveBeenCalledWith({
        content: "Ola {nome}, tudo bem?",
        intervalMinutes: 2,
        name: "Nova campanha",
        recipients: [
          {
            sessionId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
            variables: { nome: "Ana" },
          },
        ],
        scheduledStartAt: new Date("2099-01-01T10:00").toISOString(),
      }),
    );
  });

  it("blocks campaign launch until invalid csv recipients are excluded", async () => {
    const user = userEvent.setup();
    const onCreateCampaign = vi.fn(async () => createCampaign());
    render(
      <CrmWhatsappCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        sessions={[createSession({ buyerName: "Ana" })]}
        tags={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /Ana/i }));
    await user.type(
      screen.getByPlaceholderText(/5511999999999,Ana/i),
      "5511,Fantasma",
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();

    await user.click(screen.getByLabelText(/Incluir Fantasma/i));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      screen.getByLabelText(/inicio da campanha/i),
      "2099-01-01T10:00",
    );
    await user.click(screen.getByRole("button", { name: /agendar campanha/i }));

    await waitFor(() => expect(onCreateCampaign).toHaveBeenCalledTimes(1));
    expect(onCreateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: [
          {
            sessionId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
            variables: { nome: "Ana" },
          },
        ],
      }),
    );
  });

  it("builds an audience from filtered V2 leads and linked sessions", async () => {
    const user = userEvent.setup();
    const linkedSession = createSession({ buyerName: "Lead qualificado" });
    render(
      <CrmWhatsappCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onListLeads={vi.fn(async () => [
          createLead({ id: linkedSession.leadId ?? "", status: "qualified" }),
          createLead({ id: "lead-without-session", status: "qualified" }),
        ])}
        onListRecipientSessions={vi.fn(async () => [linkedSession])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        sessions={[]}
        tags={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(await screen.findByRole("tab", { name: "Leads" }));
    await user.click(screen.getByLabelText("Filtrar leads por status"));
    await user.click(screen.getByRole("option", { name: "Qualificado" }));

    expect(screen.getByText(/2 lead\(s\) encontrado\(s\)/i)).toBeVisible();
    expect(screen.getByText(/1 sem conversa vinculada/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Lead qualificado/i }),
    ).toBeVisible();
  });

  it("renders one campaign step at a time and preserves draft edits", async () => {
    const user = userEvent.setup();
    render(
      <CrmWhatsappCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        sessions={[createSession()]}
        tags={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    const name = screen.getByLabelText(/nome da campanha/i);
    await user.clear(name);
    await user.type(name, "Clientes premium");
    expect(screen.queryByText(/Selecionar visiveis/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByText(/Selecionar visiveis/i)).toBeVisible();
    expect(
      screen.queryByLabelText(/nome da campanha/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByLabelText(/nome da campanha/i)).toHaveValue(
      "Clientes premium",
    );
  });
});
