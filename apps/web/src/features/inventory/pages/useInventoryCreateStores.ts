import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createInventoryRuntimeHeaders } from "../api/inventoryRuntimeApi";
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
  subscriptionStatus: string | null;
};

const fallbackStores = [
  { id: "store_1", name: "Elite Motors", slug: "test-store" },
  { id: "store_2", name: "Carro Fácil", slug: "carrofacil" },
  { id: "store_3", name: "Prime Select", slug: "primeselect" },
  { id: "store_4", name: "Norte Veículos", slug: "norteveiculos" },
];

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
        applyStores(mapped.length > 0 ? mapped : fallbackStores);
      } catch {
        if (active) applyStores(fallbackStores);
      }
    }

    function applyStores(nextStores: InventoryCreateStoreOption[]) {
      setStores(nextStores);
      setForm((current) => ({
        ...current,
        storeId: current.storeId || nextStores[0]?.id || "",
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

  return allocations.filter(isBillingAllocation).map((allocation, index) => {
    const name = allocation.storeName ?? `Loja ${index + 1}`;
    return {
      id: allocation.storeId ?? String(index),
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    };
  });
}

function isBillingAllocation(
  value: unknown,
): value is BillingStoreAllocationDto {
  return typeof value === "object" && value !== null;
}
