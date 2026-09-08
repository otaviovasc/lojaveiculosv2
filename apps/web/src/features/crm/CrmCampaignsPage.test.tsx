// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmCampaignsPage } from "./CrmCampaignsPage";
import {
  createCampaign,
  createCampaignDetail,
  createLead,
  createSession,
} from "./CrmCampaignsPage.testFixtures";
import type { CrmCampaign } from "./crmCampaignTypes";

describe("CrmCampaignsPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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
        stageOptions={[]}
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
        stageOptions={[]}
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
        stageOptions={[]}
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
        stageOptions={[]}
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
        stageOptions={[]}
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

  it("keeps the image and caption available after the campaign API rejects the save", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:campaign-api-error"),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    const onCreateCampaign = vi.fn(async () => {
      throw new Error("campaign media rejected");
    });
    render(
      <CrmCampaignsPage
        canCancel
        canCreate
        canRead
        canUseImage
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession()]}
        stageOptions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    const imageInput = screen.getByLabelText("Selecionar imagem da campanha");
    await user.upload(
      imageInput,
      new File(["png"], "oferta.png", { type: "image/png" }),
    );
    const caption = screen.getByLabelText("Legenda da imagem");
    await user.clear(caption);
    await user.type(caption, "Legenda da oferta");
    expect(caption).toHaveAttribute("maxlength", "1000");

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /Ana/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      screen.getByLabelText(/inicio da campanha/i),
      "2099-01-01T10:00",
    );
    await user.click(screen.getByRole("button", { name: /agendar campanha/i }));

    expect(await screen.findByText("campaign media rejected")).toBeVisible();
    expect(onCreateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaFileName: "oferta.png",
        mediaType: "image/png",
      }),
    );

    await user.click(screen.getByRole("button", { name: /voltar/i }));
    await user.click(screen.getByRole("button", { name: /voltar/i }));
    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByAltText("Pré-visualização oferta.png")).toHaveAttribute(
      "src",
      "blob:campaign-api-error",
    );
    expect(screen.getByLabelText("Legenda da imagem")).toHaveValue(
      "Legenda da oferta",
    );
  });

  it("preserves a long message and shows the image caption validation", async () => {
    const user = userEvent.setup();
    render(
      <CrmCampaignsPage
        canCancel
        canCreate
        canRead
        canUseImage
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession()]}
        stageOptions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    const longMessage = "x".repeat(1001);
    const message = screen.getByLabelText("Mensagem inicial");
    fireEvent.change(message, { target: { value: longMessage } });
    await user.upload(
      screen.getByLabelText("Selecionar imagem da campanha"),
      new File(["png"], "oferta.png", { type: "image/png" }),
    );

    expect(screen.getByLabelText("Legenda da imagem")).toHaveValue(longMessage);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A legenda da imagem deve ter no máximo 1000 caracteres após a personalização.",
    );
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
  });

  it("validates rendered caption length after recipient personalization", async () => {
    const user = userEvent.setup();
    render(
      <CrmCampaignsPage
        canCancel
        canCreate
        canRead
        canUseImage
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[
          createSession({ customerDisplayName: "Ana Premium" }),
        ]}
        stageOptions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    fireEvent.change(screen.getByLabelText("Mensagem inicial"), {
      target: { value: `${"x".repeat(990)}{nome}` },
    });
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /Ana/i }));
    await user.click(screen.getByRole("button", { name: /voltar/i }));
    await user.upload(
      screen.getByLabelText("Selecionar imagem da campanha"),
      new File(["png"], "oferta.png", { type: "image/png" }),
    );

    expect(screen.getByLabelText("Legenda da imagem")).toHaveValue(
      `${"x".repeat(990)}{nome}`,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "destinatário 1 excede 1000 caracteres após a personalização",
    );
  });

  it("clears an image draft when the selected connection changes", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:connection-change"),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    const view = render(
      <CrmCampaignsPage
        campaignConnectionKey="connection-a"
        canCancel
        canCreate
        canRead
        canUseImage
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession()]}
        stageOptions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    await user.upload(
      screen.getByLabelText("Selecionar imagem da campanha"),
      new File(["png"], "oferta.png", { type: "image/png" }),
    );
    expect(screen.getByAltText("Pré-visualização oferta.png")).toBeVisible();

    view.rerender(
      <CrmCampaignsPage
        campaignConnectionKey="connection-b"
        canCancel
        canCreate
        canRead
        canUseImage
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={vi.fn(async () => createCampaign())}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession()]}
        stageOptions={[]}
      />,
    );

    await waitFor(() =>
      expect(
        screen.queryByAltText("Pré-visualização oferta.png"),
      ).not.toBeInTheDocument(),
    );
  });

  it("ignores a pending image submission after the campaign scope changes", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:stale-submit"),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    let resolveCreate: ((campaign: CrmCampaign) => void) | undefined;
    const pendingCreate = new Promise<CrmCampaign>((resolve) => {
      resolveCreate = resolve;
    });
    const onCreateCampaign = vi.fn(() => pendingCreate);
    const view = render(
      <CrmCampaignsPage
        campaignConnectionKey="connection-a"
        canCancel
        canCreate
        canRead
        canUseImage
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession()]}
        stageOptions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /nova campanha/i }));
    await user.upload(
      screen.getByLabelText("Selecionar imagem da campanha"),
      new File(["png"], "oferta.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /Ana/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.type(
      screen.getByLabelText(/inicio da campanha/i),
      "2099-01-01T10:00",
    );
    await user.click(screen.getByRole("button", { name: /agendar campanha/i }));
    await waitFor(() => expect(onCreateCampaign).toHaveBeenCalledTimes(1));

    view.rerender(
      <CrmCampaignsPage
        campaignConnectionKey="connection-b"
        canCancel
        canCreate
        canRead
        canUseImage
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        conversationCycles={[createSession()]}
        stageOptions={[]}
      />,
    );
    resolveCreate?.(createCampaign());
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Nova campanha" }),
      ).toBeVisible(),
    );
    expect(
      screen.queryByRole("heading", { name: "Campanhas de mensagens" }),
    ).not.toBeInTheDocument();
  });
});
