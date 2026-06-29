"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TemplateProperty } from "../templates/registry";
import { useSearchTracking } from "./engagement-tracking";

export interface PropertyFilterState {
  searchTerm: string;
  purpose: string;
  selectedType: string;
  minPrice: string;
  maxPrice: string;
  minBedrooms: string;
  minBathrooms: string;
  minArea: string;
  minParking: string;
  city: string;
  amenities: string[];
  featuredOnly: boolean;
}

const DEFAULT_STATE: PropertyFilterState = {
  searchTerm: "",
  purpose: "ALL",
  selectedType: "ALL",
  minPrice: "",
  maxPrice: "",
  minBedrooms: "",
  minBathrooms: "",
  minArea: "",
  minParking: "",
  city: "ALL",
  amenities: [],
  featuredOnly: false,
};

function parseSearchParams(
  searchParams: URLSearchParams,
): Partial<PropertyFilterState> {
  const state: Partial<PropertyFilterState> = {};
  const s = searchParams.get("s");
  if (s) state.searchTerm = s;
  const purpose = searchParams.get("purpose");
  if (purpose) state.purpose = purpose;
  const type = searchParams.get("type");
  if (type) state.selectedType = type;
  const minPrice = searchParams.get("minPrice");
  if (minPrice) state.minPrice = minPrice;
  const maxPrice = searchParams.get("maxPrice");
  if (maxPrice) state.maxPrice = maxPrice;
  const minBedrooms = searchParams.get("minBedrooms");
  if (minBedrooms) state.minBedrooms = minBedrooms;
  const minBathrooms = searchParams.get("minBathrooms");
  if (minBathrooms) state.minBathrooms = minBathrooms;
  const minArea = searchParams.get("minArea");
  if (minArea) state.minArea = minArea;
  const minParking = searchParams.get("minParking");
  if (minParking) state.minParking = minParking;
  const city = searchParams.get("city");
  if (city) state.city = city;
  const amenities = searchParams.get("amenities");
  if (amenities) state.amenities = amenities.split(",").filter(Boolean);
  const featured = searchParams.get("featured");
  if (featured === "1") state.featuredOnly = true;
  return state;
}

function stateToSearchParams(state: PropertyFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.searchTerm) params.set("s", state.searchTerm);
  if (state.purpose && state.purpose !== "ALL")
    params.set("purpose", state.purpose);
  if (state.selectedType && state.selectedType !== "ALL")
    params.set("type", state.selectedType);
  if (state.minPrice) params.set("minPrice", state.minPrice);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);
  if (state.minBedrooms) params.set("minBedrooms", state.minBedrooms);
  if (state.minBathrooms) params.set("minBathrooms", state.minBathrooms);
  if (state.minArea) params.set("minArea", state.minArea);
  if (state.minParking) params.set("minParking", state.minParking);
  if (state.city && state.city !== "ALL") params.set("city", state.city);
  if (state.amenities.length > 0)
    params.set("amenities", state.amenities.join(","));
  if (state.featuredOnly) params.set("featured", "1");
  return params;
}

function getComparablePrice(
  p: TemplateProperty,
  filterPurpose?: string,
): number {
  if (filterPurpose === "VENDA") return p.price;
  if (filterPurpose === "ALUGUEL") return p.rentPrice ?? p.price;
  return p.purpose === "ALUGUEL" ? (p.rentPrice ?? p.price) : p.price;
}

export function usePropertyFilters(
  properties: TemplateProperty[],
  workspaceId?: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTracking = useSearchTracking(workspaceId);
  const hasTrackedInitialSearch = useRef(false);

  const [state, setState] = useState<PropertyFilterState>(() => ({
    ...DEFAULT_STATE,
    ...parseSearchParams(searchParams),
  }));

  useEffect(() => {
    const parsed = parseSearchParams(searchParams);
    setState((prev) => ({ ...prev, ...parsed }));
  }, [searchParams]);

  const updateUrl = useCallback(
    (newState: PropertyFilterState) => {
      const params = stateToSearchParams(newState);
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router],
  );

  const updateState = useCallback(
    (updates: Partial<PropertyFilterState>) => {
      setState((prev) => {
        const next = { ...prev, ...updates };
        updateUrl(next);

        // Track filter changes
        if (searchTracking) {
          Object.entries(updates).forEach(([key, value]) => {
            if (
              key !== "searchTerm" &&
              value !== prev[key as keyof PropertyFilterState]
            ) {
              searchTracking.onFilterChange(key, value);
            }
          });

          // Track search if searchTerm changed
          if (
            updates.searchTerm !== undefined &&
            updates.searchTerm !== prev.searchTerm
          ) {
            searchTracking.onSearchStart();
          }
        }

        return next;
      });
    },
    [updateUrl, searchTracking],
  );

  const propertyTypes = useMemo(
    () => [...new Set(properties.map((p) => p.type).filter(Boolean))].sort(),
    [properties],
  );

  const cities = useMemo(
    () => [...new Set(properties.map((p) => p.city).filter(Boolean))].sort(),
    [properties],
  );

  const availableAmenities = useMemo(() => {
    const set = new Set<string>();
    for (const p of properties) {
      for (const a of p.amenities ?? []) {
        if (a) set.add(a);
      }
    }
    return [...set].sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(term) ||
          p.city?.toLowerCase().includes(term) ||
          p.neighborhood?.toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (state.purpose !== "ALL") {
        if (
          state.purpose === "VENDA" &&
          p.purpose !== "VENDA" &&
          p.purpose !== "AMBOS"
        )
          return false;
        if (
          state.purpose === "ALUGUEL" &&
          p.purpose !== "ALUGUEL" &&
          p.purpose !== "AMBOS"
        )
          return false;
      }
      if (state.selectedType !== "ALL" && p.type !== state.selectedType)
        return false;
      const price = getComparablePrice(p, state.purpose);
      if (state.minPrice && price < Number(state.minPrice)) return false;
      if (state.maxPrice && price > Number(state.maxPrice)) return false;
      if (state.minBedrooms && (p.bedrooms ?? 0) < Number(state.minBedrooms))
        return false;
      if (state.minBathrooms && (p.bathrooms ?? 0) < Number(state.minBathrooms))
        return false;
      if (state.minArea && (p.areaM2 ?? 0) < Number(state.minArea))
        return false;
      if (state.minParking && (p.parkingSpots ?? 0) < Number(state.minParking))
        return false;
      if (state.city !== "ALL" && p.city !== state.city) return false;
      if (state.amenities.length > 0) {
        const hasAll = state.amenities.every((a) => p.amenities?.includes(a));
        if (!hasAll) return false;
      }
      if (state.featuredOnly && !p.featured) return false;
      return true;
    });
  }, [properties, state]);

  // Track search results when filters change
  useEffect(() => {
    if (searchTracking && workspaceId) {
      // Debounce search tracking to avoid tracking intermediate states
      const timeoutId = setTimeout(() => {
        const isSearching =
          state.searchTerm ||
          state.purpose !== "ALL" ||
          state.selectedType !== "ALL" ||
          state.city !== "ALL" ||
          state.minPrice ||
          state.maxPrice ||
          state.minBedrooms ||
          state.amenities.length > 0;

        if (isSearching || hasTrackedInitialSearch.current) {
          searchTracking.onSearchSubmit(
            state.searchTerm,
            filteredProperties.length,
          );
          hasTrackedInitialSearch.current = true;
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [filteredProperties.length, state, searchTracking, workspaceId]);

  const clearFilters = useCallback(() => {
    setState(DEFAULT_STATE);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const toggleAmenity = useCallback(
    (amenity: string) => {
      setState((prev) => {
        const next = prev.amenities.includes(amenity)
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity];
        const nextState = { ...prev, amenities: next };
        updateUrl(nextState);
        return nextState;
      });
    },
    [updateUrl],
  );

  return {
    state,
    updateState,
    filteredProperties,
    propertyTypes,
    cities,
    availableAmenities,
    clearFilters,
    toggleAmenity,
  };
}
