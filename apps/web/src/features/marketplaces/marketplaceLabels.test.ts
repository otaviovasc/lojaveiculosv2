import { describe, expect, it } from "vitest";
import {
  getMarketplaceBlockerCopy,
  getMarketplaceConnectionLabel,
  getMarketplaceJobStatusLabel,
  getMarketplaceJobTypeLabel,
  getMarketplaceRequirementCopy,
} from "./marketplaceLabels";

describe("marketplaceLabels", () => {
  it("maps provider workflow enums to Portuguese labels", () => {
    expect(getMarketplaceConnectionLabel("reconnect_required", "error")).toBe(
      "Reconexão necessária",
    );
    expect(getMarketplaceConnectionLabel(undefined, "inactive")).toBe(
      "Conta pausada",
    );
    expect(getMarketplaceJobStatusLabel("queued")).toBe("Na fila");
    expect(getMarketplaceJobTypeLabel("listing_unpublish")).toBe(
      "Remover anúncio",
    );
  });

  it("replaces provider requirement copy with product language", () => {
    expect(
      getMarketplaceRequirementCopy({
        code: "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED",
        message: "Marketplace account must be reconnected.",
        severity: "blocked",
        userAction: "Reconnect the marketplace account.",
      }),
    ).toEqual({
      action: "Reconecte a conta antes de sincronizar o estoque.",
      message: "Reconexão necessária",
    });
  });

  it("replaces listing blocker payloads with actionable labels", () => {
    expect(
      getMarketplaceBlockerCopy({
        code: "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS",
        message: "provider_photo_error",
        userAction: "internal_action",
      }),
    ).toEqual({
      action: "Adicione e selecione fotos públicas do veículo.",
      message: "Fotos públicas obrigatórias",
    });
  });
});
