import { describe, expect, it } from "vitest";
import {
  buildCustomPagePreviewPath,
  buildCustomPagePublicPath,
  createDuplicatePageSlug,
  isValidCustomPageSlug,
  slugifyCustomPage,
} from "./customPageUtils";

describe("custom page utilities", () => {
  it("normalizes custom page slugs to the UI contract", () => {
    expect(slugifyCustomPage("Ofertas do Mês 2026!")).toBe(
      "ofertas-do-mes-2026",
    );
    expect(isValidCustomPageSlug("ofertas-do-mes-2026")).toBe(true);
    expect(isValidCustomPageSlug("ofertas do mes")).toBe(false);
  });

  it("builds store-scoped public and preview paths", () => {
    const page = {
      previewUrl: "/p/ofertas?token=secret-token",
      secretToken: null,
      slug: "ofertas",
    };

    expect(buildCustomPagePublicPath(page, "test-store")).toBe(
      "/test-store/p/ofertas",
    );
    expect(buildCustomPagePreviewPath(page, "test-store")).toBe(
      "/test-store/p/ofertas?token=secret-token",
    );
  });

  it("creates non-colliding duplicate slugs", () => {
    expect(
      createDuplicatePageSlug("ofertas", [
        { slug: "ofertas" },
        { slug: "ofertas-copia" },
      ]),
    ).toBe("ofertas-copia-2");
  });
});
