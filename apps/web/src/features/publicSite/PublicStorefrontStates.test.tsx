// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusIllustration } from "../../components/ui/StatusIllustration";
import { AppApiError } from "../../lib/apiErrors";
import type { PublicStorefrontApi } from "./apiClient";
import { PublicCustomPageRoute } from "./PublicCustomPageRoute";
import { PublicStorefrontPage } from "./PublicStorefrontPage";
import {
  StorefrontLoadingFrame,
  StorefrontStateFrame,
} from "./PublicStorefrontPageSupport";
import { derivePublicStorefrontState } from "./state";

afterEach(cleanup);

describe("derivePublicStorefrontState", () => {
  it("maps API 404 failures to a dedicated not-found state", () => {
    const error = new AppApiError({ message: "store missing", status: 404 });

    expect(derivePublicStorefrontState({ error, isLoading: false })).toEqual({
      kind: "not-found",
    });
  });

  it("keeps other failures as retryable errors", () => {
    const error = new AppApiError({ message: "boom", status: 500 });
    const state = derivePublicStorefrontState({ error, isLoading: false });

    expect(state.kind).toBe("error");
  });

  it("keeps generic failures as retryable errors", () => {
    const state = derivePublicStorefrontState({
      error: new Error("network down"),
      isLoading: false,
    });

    expect(state.kind).toBe("error");
  });
});

describe("PublicStorefrontPage states", () => {
  it("shows a friendly not-found page when the store does not exist", async () => {
    const api = {
      getCustomPage: vi.fn(),
      getListing: vi.fn(),
      getSettings: () =>
        Promise.reject(new AppApiError({ message: "missing", status: 404 })),
      listListings: vi.fn(),
      submitListingInterest: vi.fn(),
    } satisfies PublicStorefrontApi;

    render(
      <MemoryRouter initialEntries={["/loja-inexistente"]}>
        <Routes>
          <Route
            element={<PublicStorefrontPage api={api} />}
            path="/:storeSlug"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Vitrine não encontrada",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Não encontramos uma vitrine neste endereço/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Voltar para o início/ }),
    ).toHaveAttribute("href", "/");
  });
});

describe("PublicCustomPageRoute states", () => {
  it("shows a friendly not-found page when the custom page does not exist", async () => {
    const api = {
      getCustomPage: () =>
        Promise.reject(new AppApiError({ message: "missing", status: 404 })),
      getListing: vi.fn(),
      getSettings: vi.fn(),
      listListings: vi.fn(),
      submitListingInterest: vi.fn(),
    } satisfies PublicStorefrontApi;

    render(
      <MemoryRouter initialEntries={["/loja-x/p/pagina-inexistente"]}>
        <Routes>
          <Route
            element={<PublicCustomPageRoute api={api} />}
            path="/:storeSlug/p/:pageSlug"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Página não encontrada",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Voltar para o início/ }),
    ).toHaveAttribute("href", "/");
  });

  it("keeps other failures as a retryable error page", async () => {
    const api = {
      getCustomPage: () =>
        Promise.reject(new AppApiError({ message: "boom", status: 500 })),
      getListing: vi.fn(),
      getSettings: vi.fn(),
      listListings: vi.fn(),
      submitListingInterest: vi.fn(),
    } satisfies PublicStorefrontApi;

    render(
      <MemoryRouter initialEntries={["/loja-x/p/pagina-inexistente"]}>
        <Routes>
          <Route
            element={<PublicCustomPageRoute api={api} />}
            path="/:storeSlug/p/:pageSlug"
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Página temporariamente indisponível",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tentar novamente/ }),
    ).toBeInTheDocument();
  });
});

describe("StorefrontStateFrame", () => {
  it("renders illustration, body copy, and the retry action", () => {
    render(
      <StorefrontStateFrame
        action={<button type="button">Tentar novamente</button>}
        body="Não foi possível carregar a vitrine agora."
        illustration={<StatusIllustration variant="offline" />}
        title="Vitrine temporariamente indisponível"
        tone="danger"
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "danger");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Vitrine temporariamente indisponível",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Não foi possível carregar a vitrine agora."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
  });
});

describe("StorefrontLoadingFrame", () => {
  it("announces loading as a busy status region", () => {
    render(<StorefrontLoadingFrame title="Carregando estoque" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Carregando estoque");
  });
});
