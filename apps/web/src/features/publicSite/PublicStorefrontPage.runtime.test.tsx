// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publicStorefrontPreview } from "./fixtures";
import { PublicStorefrontPage } from "./PublicStorefrontPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("PublicStorefrontPage runtime API", () => {
  it("normalizes the configured API origin and keeps the route store scope", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchMock = vi
      .spyOn(window, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        const body = url.endsWith("/settings")
          ? publicStorefrontPreview.settings
          : {
              listings: publicStorefrontPreview.listings,
              store: publicStorefrontPreview.store,
            };
        return new Response(JSON.stringify(body), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      });

    render(
      <MemoryRouter initialEntries={["/demo"]}>
        <Routes>
          <Route element={<PublicStorefrontPage />} path="/:storeSlug" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "https://api.example.com/api/v1/public/storefront/settings",
      "https://api.example.com/api/v1/public/storefront/listings?limit=48&offset=0",
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.headers).toEqual({ "x-store-slug": "demo" });
    }
  });
});
