// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmCampaignImagePicker } from "./CrmCampaignImagePicker";
import { validateCampaignImage } from "./crmCampaignMedia";

describe("CrmCampaignImagePicker", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each(["image/jpeg", "image/png", "image/webp", "image/gif"])(
    "accepts %s images",
    (type) => {
      expect(
        validateCampaignImage(new File(["image"], "campaign-image", { type })),
      ).toBeNull();
    },
  );

  it("previews and removes an image while revoking its object URL", async () => {
    const createObjectURL = vi.fn(() => "blob:campaign-preview");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const user = userEvent.setup();

    function Harness() {
      const [file, setFile] = useState<File | null>(null);
      return (
        <CrmCampaignImagePicker
          file={file}
          onError={vi.fn()}
          onRemove={() => setFile(null)}
          onSelect={setFile}
        />
      );
    }

    render(<Harness />);
    const input = screen.getByLabelText("Selecionar imagem da campanha");
    const file = new File(["png"], "oferta.png", { type: "image/png" });
    await user.upload(input, file);

    expect(screen.getByAltText("Pré-visualização oferta.png")).toHaveAttribute(
      "src",
      "blob:campaign-preview",
    );
    expect(createObjectURL).toHaveBeenCalledWith(file);

    await user.click(screen.getByRole("button", { name: "Remover imagem" }));
    expect(
      screen.queryByAltText("Pré-visualização oferta.png"),
    ).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:campaign-preview");
  });

  it("rejects unsupported and oversized images without replacing the draft", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onSelect = vi.fn();
    render(
      <CrmCampaignImagePicker
        file={null}
        onError={onError}
        onRemove={vi.fn()}
        onSelect={onSelect}
      />,
    );
    const input = screen.getByLabelText("Selecionar imagem da campanha");

    fireEvent.change(input, {
      target: {
        files: [new File(["text"], "oferta.bmp", { type: "image/bmp" })],
      },
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      "Tipo de imagem não suportado. Escolha JPEG, PNG, WebP ou GIF.",
    );

    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array(10 * 1024 * 1024 + 1)], "grande.jpg", {
            type: "image/jpeg",
          }),
        ],
      },
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onError).toHaveBeenLastCalledWith(
      "A imagem deve ter no máximo 10 MB.",
    );
  });

  it("does not expose a disabled picker as busy", () => {
    render(
      <CrmCampaignImagePicker
        disabled
        file={null}
        onError={vi.fn()}
        onRemove={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText("Selecionar imagem da campanha").parentElement,
    ).not.toHaveAttribute("aria-busy");
  });
});
