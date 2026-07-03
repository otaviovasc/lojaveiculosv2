import { useCallback, useEffect, useState } from "react";
import {
  createInventoryApi,
  type InventoryApi,
} from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import type { InventoryListingSummary } from "../inventory/model/types";
import type {
  CrmWhatsappVehicleOption,
  CrmWhatsappVehicleQuery,
} from "./crmWhatsappTypes";

export function useCrmWhatsappVehicleInventory() {
  const [inventoryApi, setInventoryApi] = useState<InventoryApi | null>(null);

  useEffect(() => {
    let active = true;
    void createInventoryApiOptions().then((options) => {
      if (active) setInventoryApi(createInventoryApi(options));
    });
    return () => {
      active = false;
    };
  }, []);

  return useCallback(
    async (
      input: CrmWhatsappVehicleQuery = {},
    ): Promise<readonly CrmWhatsappVehicleOption[]> => {
      if (!inventoryApi) return [];
      const result = await inventoryApi.listListings({
        limit: 60,
        ...(input.search ? { search: input.search } : {}),
      });
      return result.items.map(toWhatsappVehicleOption);
    },
    [inventoryApi],
  );
}

function toWhatsappVehicleOption(
  item: InventoryListingSummary,
): CrmWhatsappVehicleOption {
  const unit = item.primaryUnit ?? item.units[0] ?? null;
  return {
    colorName: unit?.colorName ?? null,
    listingId: item.listing.id,
    mediaCount: item.mediaCount,
    mileageLabel: formatMileage(item.listing.mileageKm),
    plate: unit?.plate ?? item.listing.plate,
    priceLabel: formatCurrency(item.listing.priceCents),
    status: unit?.status ?? item.listing.status,
    stockNumber: unit?.stockNumber ?? null,
    thumbnailUrl: item.primaryMediaUrl,
    title: item.listing.title,
    unitId: unit?.id ?? null,
    yearLabel: formatVehicleYear(
      item.listing.manufactureYear,
      item.listing.modelYear,
    ),
  };
}

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
}

function formatMileage(value: number | null) {
  if (value === null) return null;
  return `${new Intl.NumberFormat("pt-BR").format(value)} km`;
}

function formatVehicleYear(
  manufactureYear: number | null,
  modelYear: number | null,
) {
  const parts = [manufactureYear, modelYear].filter(
    (value): value is number => typeof value === "number",
  );
  return parts.length ? parts.join("/") : null;
}
