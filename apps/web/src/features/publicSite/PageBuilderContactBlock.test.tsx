// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultStorefrontBuilderConfig } from "@lojaveiculosv2/shared";
import { ContactSectionBlock } from "./PageBuilderContactBlock";

const component = {
  id: "contact",
  order: 0,
  props: {},
  type: "contact_section",
  visible: true,
};
const context = {
  accent: "blue",
  config: defaultStorefrontBuilderConfig,
  pageSlug: "vitrine-sedan",
  preview: false,
  renderBlocks: () => null,
  storeSlug: "demo",
  vehicles: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("vehicle vitrine contact", () => {
  it("shows success and resets the form after the API accepts the message", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    render(<ContactSectionBlock component={component} context={context} />);
    fireEvent.change(screen.getByPlaceholderText("Nome completo"), {
      target: { value: "Cliente Teste" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Enviar Mensagem" }).closest("form")!,
    );
    expect(
      await screen.findByText("Mensagem enviada com sucesso!"),
    ).toBeVisible();
    expect(screen.getByPlaceholderText("Nome completo")).toHaveValue("");
  });

  it("sends the message to the configured API origin with store scope", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1/");
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    render(<ContactSectionBlock component={component} context={context} />);
    fireEvent.submit(
      screen.getByRole("button", { name: "Enviar Mensagem" }).closest("form")!,
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.test/api/v1/public/storefront/pages/vitrine-sedan/leads",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            "x-store-slug": "demo",
          },
          method: "POST",
        }),
      ),
    );
  });

  it("does not send real leads from the editor preview", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <ContactSectionBlock
        component={component}
        context={{ ...context, preview: true }}
      />,
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "Enviar Mensagem" }).closest("form")!,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Mensagem enviada com sucesso!"),
    ).not.toBeInTheDocument();
  });
});
