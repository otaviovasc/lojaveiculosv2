import { lazy, Suspense, type ReactNode } from "react";
import { FeatureLoadingState } from "../../components/ui/FeatureStates";

export const CrmInbox = lazy(() =>
  import("./CrmInbox").then((module) => ({
    default: module.CrmInbox,
  })),
);

export function CrmSurfaceBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <FeatureLoadingState density="compact" title="Carregando CRM" />
      }
    >
      {children}
    </Suspense>
  );
}
