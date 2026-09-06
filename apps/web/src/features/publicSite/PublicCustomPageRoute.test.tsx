// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { defaultStorefrontBuilderConfig } from "@lojaveiculosv2/shared";
import { PublicCustomPageRoute } from "./PublicCustomPageRoute";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("loads the dedicated vehicle page through the normalized API origin", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
  const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        config: defaultStorefrontBuilderConfig,
        page: {
          id: "page_1",
          title: "Vitrine do Sedan",
          slug: "vitrine-sedan",
          visible: true,
          order: 0,
          components: [
            {
              id: "text",
              type: "text_block",
              order: 0,
              visible: true,
              props: { content: "Sedan disponível" },
            },
          ],
        },
        store: { name: "Loja Demo", slug: "demo" },
        vehicles: [],
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );
  render(
    <MemoryRouter initialEntries={["/demo/p/vitrine-sedan"]}>
      <Routes>
        <Route
          element={<PublicCustomPageRoute />}
          path="/:storeSlug/p/:pageSlug"
        />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/public/storefront/pages/vitrine-sedan",
      { headers: { "x-store-slug": "demo" }, method: "GET" },
    ),
  );
  expect(await screen.findByText("Sedan disponível")).toBeVisible();
});
