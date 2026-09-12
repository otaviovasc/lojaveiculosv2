import { useEffect, useState } from "react";
import { createRuntimeProductCrmApi } from "../crm/runtimeApi";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import { readLeadDocument } from "./SimulationSourceSelectors";
import type { SimulationPrefill } from "./SimulationForm.types";

export function useSimulationRoutePrefill(explicit?: SimulationPrefill) {
  const [prefill, setPrefill] = useState<SimulationPrefill | undefined>(
    () => explicit ?? readRouteReferences(),
  );

  useEffect(() => {
    if (explicit) {
      setPrefill(explicit);
      return;
    }
    const references = readRouteReferences();
    if (!references) return;
    let cancelled = false;
    void Promise.allSettled([
      references.leadId
        ? createRuntimeProductCrmApi().getLead?.(references.leadId)
        : undefined,
      references.listingId
        ? createInventoryApiOptions().then((options) =>
            createInventoryApi(options).getListing(references.listingId!),
          )
        : undefined,
    ]).then(([leadResult, listingResult]) => {
      if (cancelled) return;
      const lead =
        leadResult.status === "fulfilled" ? leadResult.value : undefined;
      const listingDetail =
        listingResult.status === "fulfilled" ? listingResult.value : undefined;
      const listing = listingDetail?.listing;
      setPrefill({
        ...references,
        ...(lead?.buyerName ? { applicantName: lead.buyerName } : {}),
        ...(lead?.buyerEmail ? { email: lead.buyerEmail } : {}),
        ...(lead?.buyerPhone ? { phone: lead.buyerPhone } : {}),
        ...(lead && readLeadDocument(lead)
          ? { cpfCnpj: readLeadDocument(lead) }
          : {}),
        ...(listing?.catalog?.fipeCode
          ? { fipeCode: listing.catalog.fipeCode }
          : {}),
        ...(listing?.manufactureYear
          ? { manufactureYear: listing.manufactureYear }
          : {}),
        ...(listing?.modelYear ? { modelYear: listing.modelYear } : {}),
        ...(listing?.priceCents
          ? { vehicleValueCents: listing.priceCents }
          : {}),
        ...(listingDetail?.units[0]?.id
          ? { unitId: listingDetail.units[0].id }
          : {}),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [explicit]);

  return prefill;
}

function readRouteReferences(): SimulationPrefill | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const leadId = params.get("leadId")?.trim();
  const listingId = params.get("listingId")?.trim();
  if (!leadId && !listingId) return undefined;
  return {
    channel: "crm_lead_details",
    ...(leadId ? { leadId } : {}),
    ...(listingId ? { listingId } : {}),
  };
}
