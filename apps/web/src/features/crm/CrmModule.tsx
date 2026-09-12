import "../../styles/crm-module.css";
import type { ProductCrmApi } from "./productCrmApi";
import { readCrmSurfaceFromHash, type CrmSurface } from "./crmRouteState";
import { CrmInbox, CrmSurfaceBoundary } from "./CrmModuleParts";
import { CrmPipelineModule } from "./CrmPipelineLazyParts";

export function CrmModule({
  api,
  routeSurface,
}: {
  api?: ProductCrmApi;
  routeSurface?: CrmSurface;
}) {
  const activeSurface = routeSurface ?? readInitialSurface();

  if (activeSurface === "conversations") {
    return (
      <CrmSurfaceBoundary>
        <CrmInbox {...(api ? { productApi: api } : {})} />
      </CrmSurfaceBoundary>
    );
  }

  return (
    <CrmSurfaceBoundary>
      <CrmPipelineModule
        {...(api ? { api } : {})}
        routeSurface={activeSurface}
      />
    </CrmSurfaceBoundary>
  );
}

function readInitialSurface(): CrmSurface {
  if (typeof window === "undefined") return "conversations";
  return readCrmSurfaceFromHash(window.location.hash);
}
