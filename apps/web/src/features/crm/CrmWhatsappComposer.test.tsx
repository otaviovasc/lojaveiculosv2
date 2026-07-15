// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanupTest, renderComposer } from "./CrmWhatsappComposer.testSupport";

describe("CrmWhatsappComposer", () => {
  afterEach(cleanupTest);

  it("uses one adaptive audio or send action beside the message field", async () => {
    const user = userEvent.setup();
    renderComposer();

    const audioAction = screen.getByRole("button", { name: "Gravar audio" });
    expect(audioAction).toBeVisible();
    expect(audioAction).not.toHaveClass("crm-icon-action-active");
    expect(
      screen.queryByRole("button", { name: "Enviar mensagem" }),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Digite uma mensagem..."),
      "Ola",
    );

    expect(
      screen.queryByRole("button", { name: "Gravar audio" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar mensagem" }),
    ).toBeVisible();
  });

  it("previews selected image media and sends it with a caption", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:crm-preview"),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    const { callbacks, container } = renderComposer();

    await user.click(screen.getByRole("button", { name: "Anexos" }));
    await user.click(screen.getByRole("button", { name: "Fotos e videos" }));
    const input = container.querySelector<HTMLInputElement>(
      'input[accept="image/*,video/*"]',
    );
    expect(input).toBeTruthy();
    const file = new File(["image"], "civic.jpg", { type: "image/jpeg" });
    await user.upload(input!, file);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByAltText("civic.jpg")).toHaveAttribute(
      "src",
      "blob:crm-preview",
    );
    await user.type(
      screen.getByPlaceholderText("Adicionar legenda..."),
      "Foto",
    );
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(callbacks.onSend).not.toHaveBeenCalled();
    expect(callbacks.onSendMedia).toHaveBeenCalledWith({
      caption: "Foto",
      file,
      mediaType: "image",
    });
  });

  it("previews selected video media in the modal editor", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:crm-video-preview"),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();
    const { callbacks, container } = renderComposer();

    await user.click(screen.getByRole("button", { name: "Anexos" }));
    await user.click(screen.getByRole("button", { name: "Fotos e videos" }));
    const input = container.querySelector<HTMLInputElement>(
      'input[accept="image/*,video/*"]',
    );
    const file = new File(["video"], "civic.mp4", { type: "video/mp4" });
    await user.upload(input!, file);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview civic.mp4")).toHaveAttribute(
      "src",
      "blob:crm-video-preview",
    );
    await user.type(
      screen.getByPlaceholderText("Adicionar legenda..."),
      "Video",
    );
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(callbacks.onSendMedia).toHaveBeenCalledWith({
      caption: "Video",
      file,
      mediaType: "video",
    });
  });

  it("inserts quick messages from the slash picker", async () => {
    const user = userEvent.setup();
    const { callbacks } = renderComposer({
      quickMessages: [
        {
          content: "Ola, tudo bem? Posso te ajudar com esse veiculo.",
          id: "quick-1",
          kind: "TEXT",
          shortcut: "/ola",
          title: "Saudacao",
        },
      ],
    });

    const textarea = screen.getByPlaceholderText("Digite uma mensagem...");
    await user.type(textarea, "/");
    await user.click(screen.getByRole("button", { name: /Saudacao/i }));

    expect(textarea).toHaveValue(
      "Ola, tudo bem? Posso te ajudar com esse veiculo.",
    );
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(callbacks.onSend).toHaveBeenCalledWith(
      "Ola, tudo bem? Posso te ajudar com esse veiculo.",
    );
  });

  it("shows first quick message guidance when no templates exist", async () => {
    const user = userEvent.setup();
    renderComposer({ quickMessages: [] });

    await user.type(screen.getByPlaceholderText("Digite uma mensagem..."), "/");

    expect(
      screen.getByText(
        "Crie sua primeira mensagem rapida e use digitando / no campo de texto.",
      ),
    ).toBeVisible();
  });

  it("records audio into the existing media send flow", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:crm-audio-preview"),
      revokeObjectURL: vi.fn(),
    });
    installMediaRecorderMock();
    const user = userEvent.setup();
    const { callbacks } = renderComposer();

    await user.click(screen.getByRole("button", { name: "Gravar audio" }));
    await user.click(screen.getByRole("button", { name: "Parar gravacao" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(callbacks.onSendMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: "audio",
      }),
    );
  });

  it("shows and clears reply context above the composer", async () => {
    const user = userEvent.setup();
    const onCancelReply = vi.fn();
    renderComposer({
      onCancelReply,
      replyToMessage: {
        content: "Ainda esta disponivel?",
        createdAt: "2026-07-02T19:00:00.000Z",
        direction: "INBOUND",
        id: "550e8400-e29b-41d4-a716-446655440000",
        senderType: "CUSTOMER",
        status: "DELIVERED",
        type: "TEXT",
      },
    });

    expect(screen.getByText("Respondendo")).toBeInTheDocument();
    expect(screen.getByText("Ainda esta disponivel?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar resposta" }));

    expect(onCancelReply).toHaveBeenCalled();
  });

  it("sends media quick messages directly from the slash picker", async () => {
    const user = userEvent.setup();
    const { callbacks } = renderComposer({
      quickMessages: [
        {
          content: "Audio de boas-vindas",
          id: "quick-audio",
          kind: "AUDIO",
          mediaUrl: "https://cdn.local/audio.ogg",
          shortcut: "/audio",
          title: "Audio",
        },
      ],
    });

    await user.type(screen.getByPlaceholderText("Digite uma mensagem..."), "/");
    await user.click(screen.getByText("Audio").closest("button")!);

    expect(callbacks.onSendQuickMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quick-audio", kind: "AUDIO" }),
    );
    expect(callbacks.onSend).not.toHaveBeenCalled();
  });
});

function installMediaRecorderMock() {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn() }],
      })),
    },
  });
  class MockMediaRecorder {
    static isTypeSupported = vi.fn(() => true);
    mimeType = "audio/webm";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    state: "inactive" | "recording" = "inactive";
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({
        data: new Blob(["audio"], { type: this.mimeType }),
      });
      this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
}
