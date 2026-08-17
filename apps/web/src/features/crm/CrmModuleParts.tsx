import { lazy, Suspense, type ReactNode } from "react";
import { FeatureLoadingState } from "../../components/ui/FeatureStates";

export const CrmWhatsappInbox = lazy(() =>
  import("./CrmWhatsappInbox").then((module) => ({
    default: module.CrmWhatsappInbox,
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
