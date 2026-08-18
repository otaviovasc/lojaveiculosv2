// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmCampaignsPage } from "./CrmCampaignsPage";
import {
  createCampaign,
  createCampaignDetail,
  createLead,
  createSession,
} from "./CrmCampaignsPage.testFixtures";

describe("CrmCampaignsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates persistent campaigns for selected conversationCycles", async () => {
    const user = userEvent.setup();
    const onCreateCampaign = vi.fn(async () => createCampaign());
    render(
      <CrmCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession({ customerDisplayName: "Ana" })]}
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
            cycleId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
            variables: { nome: "Ana" },
          },
        ],
        scheduledStartAt: new Date("2099-01-01T10:00").toISOString(),
      }),
    );
  });

  it("keeps a campaign load failure distinct from an empty campaign list", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const onListCampaigns = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("campaign service unavailable");
      return [];
    });
    render(
      <CrmCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={onListCampaigns}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[]}
        tags={[]}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "campaign service unavailable",
    );
    expect(
      screen.queryByText(/nenhuma campanha criada/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(
      await screen.findByText(/nenhuma campanha criada ainda/i),
    ).toBeVisible();
  });

  it("blocks campaign launch until invalid csv recipients are excluded", async () => {
    const user = userEvent.setup();
    const onCreateCampaign = vi.fn(async () => createCampaign());
    render(
      <CrmCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession({ customerDisplayName: "Ana" })]}
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
            cycleId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
            variables: { nome: "Ana" },
          },
        ],
      }),
    );
  });

  it("builds an audience from filtered V2 leads and linked conversationCycles", async () => {
    const user = userEvent.setup();
    const linkedSession = createSession({
      customerDisplayName: "Lead qualificado",
    });
    render(
      <CrmCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onListLeads={vi.fn(async () => [
          createLead({ id: linkedSession.leadId ?? "", status: "qualified" }),
          createLead({ id: "lead-without-cycle", status: "qualified" }),
        ])}
        onListRecipientSessions={vi.fn(async () => [linkedSession])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[]}
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
      <CrmCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession()]}
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
