import { ImagePlus, Send, Settings, Wrench } from "lucide-react";
import { providerLabels } from "./marketplaceLabels";
import type {
  MarketplaceBlockerLayer,
  MarketplaceProvider,
  MarketplaceStockAccountingStatus,
  MarketplaceStockPlanItem,
} from "./types";

export function getMarketplaceStockItemAction(item: MarketplaceStockPlanItem) {
  const inventoryHash = `#/inventory?listing=${encodeURIComponent(item.listing.listingId)}`;
  if (
    item.blockers.some(
      (blocker) =>
        blocker.code === "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS" ||
        blocker.code === "MARKETPLACE_LISTING_PHOTOS_INVALID",
    )
  ) {
    return { hash: inventoryHash, icon: ImagePlus, label: "Adicionar fotos" };
  }
  if (
    item.accountingStatus === "excluded" &&
    item.origin === "stock" &&
    item.userAction
  ) {
    return { hash: inventoryHash, icon: Send, label: "Publicar no site" };
  }
  if (
    item.blockers.some(
      (blocker) => blocker.layer === "catalog" || blocker.layer === "listing",
    )
  ) {
    return { hash: inventoryHash, icon: Wrench, label: "Corrigir veículo" };
  }
  if (item.blockers.some((blocker) => blocker.layer === "store")) {
    return { hash: "#/settings", icon: Settings, label: "Abrir configurações" };
  }
  return null;
}

export function getMarketplaceStockItemStatus(item: MarketplaceStockPlanItem) {
  if (item.origin === "provider_only") {
    return { label: "Limpeza do canal", tone: "warning" as const };
  }
  const statuses: Record<
    MarketplaceStockAccountingStatus,
    { label: string; tone: "blue" | "neutral" | "success" | "warning" }
  > = {
    excluded: { label: "Fora da publicação", tone: "neutral" },
    needs_correction: { label: "Precisa de correção", tone: "warning" },
    processing: { label: "Em processamento", tone: "blue" },
    ready: { label: "Pronto para publicar", tone: "success" },
  };
  return statuses[item.accountingStatus];
}

export function getMarketplaceBlockerLayerLabel(
  layer: MarketplaceBlockerLayer,
  provider: MarketplaceProvider,
) {
  const labels: Record<MarketplaceBlockerLayer, string> = {
    catalog: "Cadastro",
    connection: "Conexão",
    listing: "Anúncio",
    provider: providerLabels[provider],
    store: "Loja",
  };
  return labels[layer];
}

export function getMarketplaceStockVehicleLabel(
  item: MarketplaceStockPlanItem,
) {
  return item.listing.stockLabel ?? item.listing.title;
}

export function formatMarketplaceVehiclePrice(
  priceCents: number | null,
): string | null {
  if (!priceCents || priceCents <= 0) return null;
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(priceCents / 100);
}

export function formatMarketplaceVehicleMileage(
  km: number | null,
): string | null {
  if (km === null || km === undefined) return null;
  return `${new Intl.NumberFormat("pt-BR").format(km)} km`;
}

export function formatMarketplaceVehicleFuel(
  fuelType: string | null,
): string | null {
  if (!fuelType) return null;
  const map: Record<string, string> = {
    diesel: "Diesel",
    electric: "Elétrico",
    ethanol: "Etanol",
    flex: "Flex",
    gasoline: "Gasolina",
    hybrid: "Híbrido",
    other: "Outro",
  };
  return map[fuelType] ?? fuelType;
}
