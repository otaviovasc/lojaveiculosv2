import { useEffect, useMemo, useState } from "react";
import { createSettingsApi } from "../features/settings/apiClient";
import { createSettingsApiOptions } from "../features/settings/runtimeApi";
import type { StoreSettingsSnapshot } from "../features/settings/types";
import {
  applyTenantAdminFavicon,
  createTenantAdminBrand,
  createTenantAdminBrandStyle,
  tenantAdminBrandUpdatedEvent,
  type TenantAdminBrand,
  type TenantAdminBrandStyle,
  type TenantAdminBrandUpdatedDetail,
} from "./tenantAdminBranding";

export type TenantAdminBrandState =
  | { kind: "fallback"; brand: TenantAdminBrand }
  | { kind: "loading" }
  | { kind: "ready"; brand: TenantAdminBrand };

export function useTenantAdminBrand({
  fallbackStoreLabel,
}: {
  fallbackStoreLabel: string;
}): TenantAdminBrandState & { style: TenantAdminBrandStyle | undefined } {
  const [state, setState] = useState<TenantAdminBrandState>({
    kind: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadBrand() {
      try {
        const settings = await loadTenantAdminSettings();
        if (cancelled) return;
        setState({
          brand: createTenantAdminBrand(settings, fallbackStoreLabel),
          kind: "ready",
        });
      } catch {
        if (cancelled) return;
        setState({
          brand: createFallbackTenantAdminBrand(fallbackStoreLabel),
          kind: "fallback",
        });
      }
    }

    void loadBrand();

    return () => {
      cancelled = true;
    };
  }, [fallbackStoreLabel]);

  useEffect(() => {
    const handleBrandUpdate = (event: Event) => {
      const settings = (event as CustomEvent<TenantAdminBrandUpdatedDetail>)
        .detail?.settings;
      if (!settings) return;
      setState({
        brand: createTenantAdminBrand(settings, fallbackStoreLabel),
        kind: "ready",
      });
    };

    window.addEventListener(tenantAdminBrandUpdatedEvent, handleBrandUpdate);
    return () => {
      window.removeEventListener(
        tenantAdminBrandUpdatedEvent,
        handleBrandUpdate,
      );
    };
  }, [fallbackStoreLabel]);

  const brand = state.kind === "loading" ? null : state.brand;

  useEffect(() => {
    if (!brand) return;
    applyTenantAdminFavicon(brand.faviconUrl);
  }, [brand]);

  const style = useMemo(
    () => (brand ? createTenantAdminBrandStyle(brand) : undefined),
    [brand],
  );

  return {
    ...state,
    style,
  };
}

async function loadTenantAdminSettings(): Promise<StoreSettingsSnapshot> {
  return createSettingsApi(await createSettingsApiOptions()).getStoreSettings();
}

function createFallbackTenantAdminBrand(
  fallbackStoreLabel: string,
): TenantAdminBrand {
  return {
    accentColor: null,
    accentColorForeground: null,
    accentColorSoft: null,
    accentColorSoftForeground: null,
    accentColorStrong: null,
    accentColorStrongForeground: null,
    faviconUrl: null,
    iconUrl: null,
    logoUrl: null,
    storeLabel: fallbackStoreLabel,
    storeName: "Loja Veiculos",
  };
}
