import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createInventoryRuntimeHeaders } from "../api/inventoryRuntimeApi";
import { readRuntimeStoreSlug } from "../../account/currentStore";
import type { InventoryFormState } from "../model/formModel";

export type InventoryCreateStoreOption = {
  id: string;
  name: string;
  slug: string;
};

type BillingStoreAllocationDto = {
  activeEntitlementCount: number;
  addonCount: number;
  monthlyAmountCents: number;
  planCode: string | null;
  planName: string | null;
  storeId: string;
  storeName: string;
  storeSlug: string;
  subscriptionStatus: string | null;
};

export function useInventoryCreateStores(
  setForm: Dispatch<SetStateAction<InventoryFormState>>,
) {
  const [stores, setStores] = useState<InventoryCreateStoreOption[]>([]);

  useEffect(() => {
    let active = true;
    async function loadStores() {
      try {
        const headers = await createInventoryRuntimeHeaders();
        const res = await fetch("/api/v1/billing/overview", { headers });
        if (!res.ok) throw new Error();
        const data: unknown = await res.json();
        if (!active) return;
        const mapped = mapBillingStores(data);
        applyStores(mapped);
      } catch {
        if (active) applyStores([]);
      }
    }

    function applyStores(nextStores: InventoryCreateStoreOption[]) {
      const currentStoreSlug = readRuntimeStoreSlug();
      const currentStore = nextStores.find(
        (store) => store.slug === currentStoreSlug,
      );
      setStores(nextStores);
      setForm((current) => ({
        ...current,
        storeId: current.storeId || currentStore?.id || nextStores[0]?.id || "",
      }));
    }

    void loadStores();
    return () => {
      active = false;
    };
  }, [setForm]);

  return stores;
}

function mapBillingStores(data: unknown) {
  const allocations =
    typeof data === "object" && data !== null && "allocations" in data
      ? data.allocations
      : null;
  if (!Array.isArray(allocations)) return [];

  return allocations.filter(isBillingAllocation).map((allocation) => ({
    id: allocation.storeId,
    name: allocation.storeName,
    slug: allocation.storeSlug,
  }));
}

function isBillingAllocation(
  value: unknown,
): value is BillingStoreAllocationDto {
  if (typeof value !== "object" || value === null) return false;
  const allocation = value as Record<string, unknown>;
  return (
    typeof allocation.storeId === "string" &&
    allocation.storeId.trim().length > 0 &&
    typeof allocation.storeName === "string" &&
    allocation.storeName.trim().length > 0 &&
    typeof allocation.storeSlug === "string" &&
    allocation.storeSlug.trim().length > 0
  );
}
